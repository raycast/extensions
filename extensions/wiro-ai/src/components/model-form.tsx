import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Job } from "../lib/catalog";
import {
  fieldParams,
  fileMatchesKind,
  fileSlots,
  hiddenDefaults,
  inputFit,
  isListedModel,
  isLiveModel,
  modelFields,
  primarySlot,
  promptParameter,
  validateField,
  type FileSlot,
  type InputFit,
  type ModelField,
} from "../lib/params";
import { priceLine, quote } from "../lib/price";
import { credentials } from "../lib/preferences";
import { getModel, listModels, modelPageUrl, modelSlug, runModel, type UploadFile, type WiroModel } from "../lib/wiro";
import { TaskResult } from "./task-result";

interface ModelChoice {
  slug: string;
  title: string;
}

/** Every model of these categories, deduplicated, in the catalog's order. */
async function loadCategoryModels(categories: string[], skipLive: boolean): Promise<ModelChoice[]> {
  const seen = new Map<string, ModelChoice>();
  for (const category of categories) {
    const { models } = await listModels({ categories: [category], limit: 100 });
    for (const model of models) {
      const slug = modelSlug(model);
      if (seen.has(slug) || !isListedModel(slug, model.title, model.description)) continue;
      if (skipLive && isLiveModel(model)) continue;
      seen.set(slug, { slug, title: model.title });
    }
  }
  return [...seen.values()];
}

async function searchAllModels(search: string): Promise<ModelChoice[]> {
  const { models } = await listModels({ search: search.trim(), limit: 40 });
  return models
    .map((model) => ({ slug: modelSlug(model), title: model.title, description: model.description }))
    .filter((model) => isListedModel(model.slug, model.title, model.description))
    .map(({ slug, title }) => ({ slug, title }));
}

// Schemas fetched for the input checks, shared across forms while the command runs.
const schemaCache = new Map<string, Promise<WiroModel>>();
function cachedSchema(slug: string): Promise<WiroModel> {
  let pending = schemaCache.get(slug);
  if (!pending) {
    pending = getModel(slug);
    pending.catch(() => schemaCache.delete(slug));
    schemaCache.set(slug, pending);
  }
  return pending;
}

const FIT_CHECKS = 15;

/** Checks the first models of a list against the input a job needs, three at a time. */
/** A model's fit, or `failed` when its schema could not be read. */
type FitCheck = InputFit | "failed";

function useInputFits(choices: ModelChoice[] | undefined, input: Job["input"]): Record<string, FitCheck> {
  const [fits, setFits] = useState<Record<string, FitCheck>>({});
  const key = (choices ?? []).map((choice) => choice.slug).join("|");
  useEffect(() => {
    if (!input || !choices || choices.length === 0) return;
    let cancelled = false;
    const queue = choices.slice(0, FIT_CHECKS).map((choice) => choice.slug);
    const worker = async () => {
      for (let slug = queue.shift(); slug && !cancelled; slug = queue.shift()) {
        try {
          const fit = inputFit(await cachedSchema(slug), input);
          if (!cancelled) setFits((previous) => ({ ...previous, [slug]: fit }));
        } catch {
          // A failed check counts as done, so the suggestion moves past the model instead of
          // waiting for it. The model stays in the list, and picking it reads its schema again.
          if (!cancelled) setFits((previous) => ({ ...previous, [slug]: "failed" }));
        }
      }
    };
    Promise.all([worker(), worker(), worker()]);
    return () => {
      cancelled = true;
    };
  }, [key, input]);
  return fits;
}

/**
 * The model to start with when the user has not picked one: the first in the catalog's order
 * that takes the job's input on its own. It waits for the checks of the models before it, so
 * the pick does not jump while they finish.
 */
function suggestedModel(
  choices: ModelChoice[],
  fits: Record<string, FitCheck>,
  needsInput: boolean,
): string | undefined {
  if (!needsInput) return choices[0]?.slug;
  for (const [index, choice] of choices.entries()) {
    const fit = fits[choice.slug];
    if (fit === "full") return choice.slug;
    if (fit === undefined) return index < FIT_CHECKS ? undefined : choice.slug;
  }
  return choices[0]?.slug;
}

function summary(text: string | undefined): string | undefined {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  if (clean.length <= 220) return clean;
  const cut = clean.slice(0, 220);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : 220)}…`;
}

const KIND_TITLES = { image: "Image", video: "Video", audio: "Audio", file: "File" } as const;

export interface ModelFormProps {
  /** One job, or several to choose from (operations or sources). */
  jobs: Job[];
  /** The label of the job picker, such as "Operation" or "Source". */
  jobLabel?: string;
  initialJobId?: string;
  initialModel?: string;
  /** Files to start with, such as the Finder selection, read once when the form opens. */
  loadInitialFiles?: () => Promise<string[]>;
  /** A prompt to start with, such as the selected text, read once when the form opens. */
  loadInitialPrompt?: () => Promise<string | undefined>;
}

export function ModelForm({
  jobs,
  jobLabel,
  initialJobId,
  initialModel,
  loadInitialFiles,
  loadInitialPrompt,
}: ModelFormProps) {
  const { push } = useNavigation();
  const pickerKey = `job-${jobs.map((item) => item.id).join("-")}`;
  const [storedJobId, setStoredJobId] = useCachedState<string>(pickerKey, initialJobId ?? jobs[0].id);
  const [jobOverride, setJobOverride] = useState<string | undefined>(initialJobId);
  const job = jobs.find((item) => item.id === (jobOverride ?? storedJobId)) ?? jobs[0];
  const anyModel = job.categories.length === 0;

  const [storedSlug, setStoredSlug] = useCachedState<string>(`model-${job.id}`, "");
  const [chosenSlug, setChosenSlug] = useState<string | undefined>(initialModel?.trim().toLowerCase());
  const [modelSearch, setModelSearch] = useState("");

  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<Record<string, string[]>>({});
  const [initialFiles, setInitialFiles] = useState<string[]>([]);
  const [initialFilesLoaded, setInitialFilesLoaded] = useState(!loadInitialFiles);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    loadInitialFiles?.()
      .then((paths) => setInitialFiles(paths))
      .catch(() => undefined) // No selection: the picker starts empty.
      .finally(() => setInitialFilesLoaded(true));
    loadInitialPrompt?.()
      .then((text) => text?.trim() && setPrompt((current) => current || text.trim()))
      .catch(() => undefined); // No selected text: the prompt starts empty.
  }, []);

  const categoryList = useCachedPromise(loadCategoryModels, [job.categories, Boolean(job.skipLive)], {
    execute: !anyModel,
    failureToastOptions: { title: "Could not load the models" },
  });
  const searchList = useCachedPromise(searchAllModels, [modelSearch], {
    execute: anyModel,
    keepPreviousData: true,
    failureToastOptions: { title: "Could not search the models" },
  });
  const models = anyModel ? searchList.data : categoryList.data;
  const modelsLoading = anyModel ? searchList.isLoading : categoryList.isLoading;
  const modelsError = anyModel ? searchList.error : categoryList.error;

  const fits = useInputFits(anyModel ? undefined : models, job.input);
  const choices = (models ?? []).filter((choice) => fits[choice.slug] !== "none");
  const picked = chosenSlug || storedSlug || undefined;
  // Run Any Model never picks for the user: typing a search must not change the model.
  const slug = picked || (anyModel ? undefined : suggestedModel(choices, fits, Boolean(job.input)));
  if (slug && !choices.some((choice) => choice.slug === slug)) choices.unshift({ slug, title: slug });

  const detail = useCachedPromise((id: string) => getModel(id, credentials()), [slug ?? ""], {
    execute: Boolean(slug),
    failureToastOptions: { title: "Could not load the model settings" },
  });
  const model =
    detail.data && slug && modelSlug(detail.data).toLowerCase() === slug.toLowerCase() ? detail.data : undefined;

  const promptParam = model ? promptParameter(model) : undefined;
  const showPrompt = Boolean(promptParam) && (job.prompt !== "hidden" || Boolean(promptParam?.required));
  const promptRequired = showPrompt && (job.prompt === "required" || Boolean(promptParam?.required));
  const primary: FileSlot | undefined = model && job.input ? primarySlot(model, job.input) : undefined;
  const otherSlots = model ? fileSlots(model).filter((slot) => slot.param.id !== primary?.param.id) : [];
  const shownSlots = otherSlots.filter((slot) => slot.param.required || showAdvanced || anyModel);
  const allFields = useMemo(() => (model ? modelFields(model) : []), [model]);
  const shownFields = allFields.filter((field) => !field.advanced || showAdvanced);
  // A setting changed under advanced settings is still sent after the section is hidden again.
  const sentFields = allFields.filter(
    (field) => !field.advanced || showAdvanced || values[`${slug}::${field.id}`] !== undefined,
  );
  const hasAdvanced =
    allFields.some((field) => field.advanced) || otherSlots.some((slot) => !slot.param.required && !anyModel);

  const key = (id: string) => `${slug}::${id}`;
  const valueOf = (field: ModelField) => values[key(field.id)] ?? field.defaultValue;
  const filesOf = (slot: FileSlot) => files[key(slot.param.id)] ?? (slot === primary ? initialFiles : []);
  const fieldValues = Object.fromEntries(sentFields.map((field) => [field.id, valueOf(field)]));
  const sentFileSlots = [primary, ...otherSlots].filter((slot): slot is FileSlot =>
    Boolean(slot && filesOf(slot).length),
  );
  const sentIds = [
    ...sentFields.map((field) => field.id),
    ...(showPrompt && promptParam ? [promptParam.id] : []),
    ...sentFileSlots.map((slot) => slot.param.id),
  ];
  const runParams: Record<string, unknown> = model
    ? { ...hiddenDefaults(model, sentIds), ...fieldParams(sentFields, fieldValues) }
    : {};
  for (const slot of sentFileSlots) runParams[slot.param.id] = filesOf(slot);
  const price = model ? priceLine(quote(model, runParams, { promptChars: prompt.trim().length })) : undefined;

  function chooseModel(next: string) {
    if (!next || next === picked) return;
    setChosenSlug(next);
    setStoredSlug(next);
  }

  function chooseJob(next: string) {
    if (next === job.id) return;
    setJobOverride(undefined);
    setStoredJobId(next);
    setChosenSlug(undefined);
  }

  function clearError(id: string) {
    if (errors[id]) setErrors((previous) => ({ ...previous, [id]: undefined }));
  }

  async function submit() {
    if (submittingRef.current) return;
    if (!slug || !model) {
      await showFailureToast(
        detail.error ??
          modelsError ??
          new Error(slug ? "The model settings are still loading." : "Pick a model first."),
        { title: "Not ready yet" },
      );
      return;
    }
    const nextErrors: Record<string, string | undefined> = {};
    if (job.input && !primary) {
      await showFailureToast(new Error(`${slug} cannot take this ${job.input}. Pick another model.`), {
        title: `No ${job.input} input`,
      });
      return;
    }
    if (promptRequired && !prompt.trim())
      nextErrors.prompt = job.promptTitle ? `Write the ${job.promptTitle.toLowerCase()}` : "Write a prompt";
    for (const slot of [primary, ...shownSlots]) {
      if (!slot) continue;
      const chosen = filesOf(slot);
      if (chosen.length === 0 && (slot.param.required || slot === primary))
        nextErrors[key(slot.param.id)] = "Choose a file";
      else if (chosen.some((path) => !fileMatchesKind(path, slot.kind))) {
        nextErrors[key(slot.param.id)] = `Choose ${slot.kind === "audio" ? "an audio" : `a ${slot.kind}`} file`;
      }
    }
    for (const field of sentFields) {
      const error = validateField(field, valueOf(field));
      if (error) {
        nextErrors[key(field.id)] = error;
        if (field.advanced) setShowAdvanced(true);
      }
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const params: Record<string, unknown> = {
      ...hiddenDefaults(model, sentIds),
      ...fieldParams(sentFields, fieldValues),
    };
    if (showPrompt && promptParam && prompt.trim()) params[promptParam.id] = prompt.trim();
    const uploads: UploadFile[] = sentFileSlots.flatMap((slot) =>
      filesOf(slot).map((path) => ({ field: slot.param.id, path, type: String(slot.param.type) })),
    );

    submittingRef.current = true;
    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Starting task" });
    try {
      const run = await runModel(slug, params, credentials(), uploads);
      await toast.hide();
      push(
        <TaskResult slug={slug} taskId={run.taskid} taskToken={run.tasktoken} noun={job.noun} prompt={prompt.trim()} />,
      );
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: "Could not start the task" });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function filePicker(slot: FileSlot, title: string) {
    const id = key(slot.param.id);
    return (
      <Form.FilePicker
        key={id}
        id={id}
        title={title}
        info={slot.param.description?.trim() || slot.param.note?.trim() || undefined}
        allowMultipleSelection={slot.multiple}
        canChooseDirectories={false}
        value={filesOf(slot)}
        error={errors[id]}
        onChange={(paths) => {
          setFiles((previous) => ({ ...previous, [id]: paths }));
          clearError(id);
        }}
      />
    );
  }

  function renderField(field: ModelField) {
    const id = key(field.id);
    const onChange = (value: string | boolean) => {
      setValues((previous) => ({ ...previous, [id]: value }));
      clearError(id);
    };
    if (field.kind === "dropdown") {
      return (
        <Form.Dropdown
          key={id}
          id={id}
          title={field.title}
          info={field.info}
          value={String(valueOf(field))}
          onChange={onChange}
        >
          {field.options.map((option) => (
            <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </Form.Dropdown>
      );
    }
    if (field.kind === "checkbox") {
      return (
        <Form.Checkbox
          key={id}
          id={id}
          label={field.title}
          info={field.info}
          value={valueOf(field) === true}
          onChange={onChange}
        />
      );
    }
    const TextInput = field.multiline ? Form.TextArea : Form.TextField;
    return (
      <TextInput
        key={id}
        id={id}
        title={field.title}
        info={field.info}
        placeholder={field.placeholder}
        error={errors[id]}
        value={String(valueOf(field))}
        onChange={onChange}
      />
    );
  }

  const description = model ? summary(model.description || model.seodescription) : undefined;
  const emptyTitle = modelsLoading ? "Loading models…" : modelsError ? "Could not load models" : "No models found";

  return (
    <Form
      isLoading={modelsLoading || detail.isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={job.title} icon={Icon.Wand} onSubmit={submit} />
          {slug && <Action.OpenInBrowser title="Open Model Page" icon={Icon.Globe} url={modelPageUrl(slug)} />}
        </ActionPanel>
      }
    >
      {jobs.length > 1 && (
        <Form.Dropdown id="job" title={jobLabel ?? "Action"} value={job.id} onChange={chooseJob}>
          {jobs.map((item) => (
            <Form.Dropdown.Item key={item.id} value={item.id} title={item.label ?? item.title} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Dropdown
        key={job.id}
        id="model"
        title="Model"
        info={
          anyModel ? "Type to search the 1,000+ models in the Wiro AI catalog." : "Models from the Wiro AI catalog."
        }
        value={slug ?? ""}
        onChange={chooseModel}
        {...(anyModel ? { onSearchTextChange: setModelSearch, throttle: true, filtering: false } : {})}
      >
        {!slug && choices.length > 0 && (
          <Form.Dropdown.Item value="" title={anyModel ? "Search and pick a model" : "Checking models…"} />
        )}
        {choices.length === 0 ? (
          <Form.Dropdown.Item value="" title={emptyTitle} />
        ) : (
          choices.map((choice) => (
            <Form.Dropdown.Item key={choice.slug} value={choice.slug} title={choice.slug} keywords={[choice.title]} />
          ))
        )}
      </Form.Dropdown>
      {description && <Form.Description text={description} />}
      {job.input && model && !primary && (
        <Form.Description
          title={KIND_TITLES[job.input]}
          text={`This model takes no ${job.input}. Pick another model.`}
        />
      )}
      {primary && initialFilesLoaded && filePicker(primary, KIND_TITLES[job.input ?? primary.kind])}
      {showPrompt && (
        <Form.TextArea
          id="prompt"
          title={job.promptTitle ?? "Prompt"}
          placeholder={job.promptPlaceholder ?? promptParam?.placeholder ?? "Describe what you want"}
          value={prompt}
          error={errors.prompt}
          onChange={(text) => {
            setPrompt(text);
            clearError("prompt");
          }}
        />
      )}
      {shownSlots.map((slot) => filePicker(slot, slot.param.label?.trim() || KIND_TITLES[slot.kind]))}
      {(shownFields.length > 0 || hasAdvanced) && <Form.Separator />}
      {shownFields.map(renderField)}
      {hasAdvanced && (
        <Form.Checkbox id="advanced" label="Show advanced settings" value={showAdvanced} onChange={setShowAdvanced} />
      )}
      {price && <Form.Description title="Price" text={price} />}
    </Form>
  );
}
