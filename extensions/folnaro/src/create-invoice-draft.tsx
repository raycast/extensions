import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  List,
  PopToRootType,
  Toast,
  showHUD,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import type { FolnaroApi } from "./lib/folnaro";
import { TAX_RATES, UNITS, buildLines, type FormValues, type LineState } from "./lib/draft";
import { isoDay } from "./lib/format";
import { t, type StringKey } from "./lib/text";
import { openFolnaro, showError, useFolnaro } from "./lib/raycast";
import { recordLink } from "./lib/search";
import { workableProjects } from "./lib/timer";
import type { Customer, Project } from "./lib/types";

interface LaunchContext {
  customerId?: string;
}

async function load(api: FolnaroApi): Promise<{ canCreate: boolean; customers: Customer[]; projects: Project[] }> {
  const [allowed, customers, projects] = await Promise.all([
    api.allowedTools(),
    api.customers({ limit: 500 }),
    api.projects(),
  ]);
  return {
    canCreate: allowed.has("documents_create_draft"),
    customers: customers.filter((customer) => !customer.is_archived),
    projects: workableProjects(projects),
  };
}

export default function CreateInvoiceDraft(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const api = useFolnaro();
  const { data, isLoading } = usePromise(() => load(api), [], { onError: (error) => void showError(error) });
  const [customerId, setCustomerId] = useState<string>(props.launchContext?.customerId ?? "");
  const [lines, setLines] = useState<LineState[]>([{ key: 0 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (data && !data.canCreate) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title={t("draft.locked.title")}
          description={t("draft.locked.description")}
          actions={
            <ActionPanel>
              <Action title={t("action.openFolnaro")} icon={Icon.AppWindow} onAction={() => openFolnaro()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const projects = (data?.projects ?? []).filter((project) => project.customer_id === customerId);
  const clearError = (id: string) => () =>
    errors[id] &&
    setErrors((current) => {
      const copy = { ...current };
      delete copy[id];
      return copy;
    });

  const submit = async (values: FormValues) => {
    const nextErrors: Record<string, string> = {};
    const customer = data?.customers.find((item) => item.id === values.customer);
    if (!customer) nextErrors.customer = t("draft.validation.customer");
    const built = buildLines(values, lines);
    Object.assign(nextErrors, built.errors);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !customer || !built.lines) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: t("draft.creating") });
    try {
      const start = values.serviceStart instanceof Date ? isoDay(values.serviceStart) : undefined;
      const end = values.serviceEnd instanceof Date ? isoDay(values.serviceEnd) : undefined;
      const projectId = String(values.project || "") || undefined;
      const document = await api.createDraft({
        kind: "invoice",
        customer_id: customer.id,
        project_id: projectId,
        title: String(values.title ?? "").trim() || undefined,
        service_date_start: start,
        service_date_end: end ?? start,
        lines: built.lines.map((line) => ({ ...line, project_id: projectId })),
      });
      await toast.hide();
      await openFolnaro(recordLink("document", document.id)).catch(() => undefined);
      await showHUD(t("draft.created", { customer: customer.display_name }), {
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      await toast.hide();
      await showError(error);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("draft.submit")} icon={Icon.NewDocument} onSubmit={submit} />
          <Action
            title={t("draft.addLine")}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => setLines((current) => [...current, { key: (current.at(-1)?.key ?? 0) + 1 }])}
          />
          {lines.length > 1 ? (
            <Action
              title={t("draft.removeLine")}
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={() => setLines((current) => current.slice(0, -1))}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description text={t("draft.info")} />
      <Form.Dropdown
        id="customer"
        title={t("draft.customer")}
        placeholder={t("draft.customerPlaceholder")}
        value={customerId}
        error={errors.customer}
        onChange={(value) => {
          setCustomerId(value);
          clearError("customer")();
        }}
        filtering
      >
        <Form.Dropdown.Item value="" title={t("draft.customerPlaceholder")} />
        {(data?.customers ?? []).map((customer) => (
          <Form.Dropdown.Item
            key={customer.id}
            value={customer.id}
            title={customer.display_name}
            keywords={[customer.number]}
          />
        ))}
      </Form.Dropdown>
      {projects.length ? (
        <Form.Dropdown id="project" title={t("draft.project")} defaultValue="">
          <Form.Dropdown.Item value="" title={t("search.noProject")} />
          {projects.map((project) => (
            <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.TextField id="title" title={t("draft.title")} placeholder={t("draft.titlePlaceholder")} />
      <Form.DatePicker id="serviceStart" title={t("draft.serviceStart")} type={Form.DatePicker.Type.Date} />
      <Form.DatePicker id="serviceEnd" title={t("draft.serviceEnd")} type={Form.DatePicker.Type.Date} />
      {lines.map(({ key }, index) => (
        <LineFields key={key} lineKey={key} index={index} errors={errors} clearError={clearError} />
      ))}
    </Form>
  );
}

function LineFields(props: {
  lineKey: number;
  index: number;
  errors: Record<string, string>;
  clearError: (id: string) => () => void;
}) {
  const { lineKey: key, errors } = props;
  return (
    <>
      <Form.Separator />
      <Form.Description text={t("draft.line", { index: props.index + 1 })} />
      <Form.TextField
        id={`title-${key}`}
        title={t("draft.lineTitle")}
        placeholder={t("draft.lineTitlePlaceholder")}
        error={errors[`title-${key}`]}
        onChange={props.clearError(`title-${key}`)}
      />
      <Form.TextField
        id={`quantity-${key}`}
        title={t("draft.quantity")}
        placeholder="1"
        defaultValue="1"
        error={errors[`quantity-${key}`]}
        onChange={props.clearError(`quantity-${key}`)}
      />
      <Form.Dropdown id={`unit-${key}`} title={t("draft.unit")} defaultValue="HUR">
        {UNITS.map((unit) => (
          <Form.Dropdown.Item key={unit} value={unit} title={t(`unit.${unit}` as StringKey)} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id={`price-${key}`}
        title={t("draft.unitPrice")}
        placeholder={t("draft.unitPricePlaceholder")}
        error={errors[`price-${key}`]}
        onChange={props.clearError(`price-${key}`)}
      />
      <Form.Dropdown id={`tax-${key}`} title={t("draft.taxRate")} defaultValue="19">
        {TAX_RATES.map((rate) => (
          <Form.Dropdown.Item key={rate} value={rate} title={`${rate} %`} />
        ))}
      </Form.Dropdown>
    </>
  );
}
