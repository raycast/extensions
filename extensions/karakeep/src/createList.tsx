import { Action, ActionPanel, Form, Icon, showHUD, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchCreateList } from "./apis";
import { QueryBuilderActions } from "./components/QueryBuilderActions";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useTranslation } from "./hooks/useTranslation";
import { List } from "./types";
import { isEmoji, makeSmartQueryValidator } from "./utils/formatting";
import { DEFAULT_LIST_ICON, ListIconField } from "./components/ListIconField";
import { runWithToast } from "./utils/toast";
import { labelLists } from "./utils/listLabels";
import { ensureReachable } from "./utils/submitGuard";
import { useApiReachable } from "./hooks/useApiReachable";
import { OfflineFormNotice, OpenSettingsAction, StartKarakeepAction } from "./components/OfflineFormNotice";

const log = logger.child("[CreateList]");

interface ListFormValues {
  name: string;
  icon: string;
  description: string;
  parentId: string;
  type: string;
  query: string;
}

interface CreateListViewProps {
  onListCreated?: (list: List) => void | Promise<void>;
  showSuccessHUD?: boolean;
}

export default function CreateListView({ onListCreated, showSuccessHUD = true }: CreateListViewProps = {}) {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const { state: reachability, reachable, offline, unauthorized, isRecovering, canStart, start } = useApiReachable();
  const { lists } = useGetAllLists(reachable);

  const { handleSubmit, itemProps, setValue, values } = useForm<ListFormValues>({
    initialValues: { name: "", icon: DEFAULT_LIST_ICON, description: "", parentId: "", type: "manual", query: "" },
    validation: {
      name: (value) => (!value?.trim() ? t("common.fieldRequired", { field: t("list.listName") }) : undefined),
      icon: (value) => (!isEmoji(value || "") ? t("list.listIconInvalid") : undefined),
      query: makeSmartQueryValidator(t),
    },
    async onSubmit(values) {
      log.info("Creating list", { name: values.name, type: values.type, query: values.query || undefined });

      // Same pre-flight as the other create forms — don't write into a dead
      // server and lose the filled-in list definition.
      if ((await ensureReachable(values.name)) !== "ok") return;

      const payload = {
        name: values.name.trim(),
        icon: values.icon.trim() || DEFAULT_LIST_ICON,
        description: values.description.trim() || undefined,
        parentId: values.parentId || undefined,
        type: values.type as "manual" | "smart",
        query: values.type === "smart" ? values.query?.trim() : undefined,
      };
      log.debug("Sending create list request", payload);

      const result = await runWithToast({
        loading: { title: t("list.toast.create.loading") },
        success: { title: t("list.toast.create.success") },
        failure: { title: t("list.toast.create.error") },
        action: async () => {
          const createdList = await fetchCreateList(payload);
          log.info("List created successfully", { name: createdList.name, id: createdList.id });
          return createdList;
        },
      });

      if (result) {
        await onListCreated?.(result);
        pop();
        if (showSuccessHUD) {
          await showHUD(t("list.toast.create.successWithName", { name: result.name }));
        }
      }
    },
  });

  return (
    <Form
      navigationTitle={t("list.createList")}
      isLoading={reachability === "checking"}
      actions={
        <ActionPanel>
          {/* First = bound to ↵ while offline; see OfflineFormNotice. */}
          <OpenSettingsAction unauthorized={unauthorized} />
          <StartKarakeepAction offline={offline} canStart={canStart} isRecovering={isRecovering} onStart={start} />
          <Action.SubmitForm title={t("list.createList")} onSubmit={handleSubmit} icon={Icon.Plus} />
          {values.type === "smart" && (
            <QueryBuilderActions query={values.query} onInsert={(q) => setValue("query", q)} />
          )}
        </ActionPanel>
      }
    >
      <OfflineFormNotice offline={offline} canStart={canStart} unauthorized={unauthorized} />

      <Form.TextField
        {...itemProps.name}
        title={t("list.listName")}
        placeholder={t("list.listNamePlaceholder")}
        autoFocus
      />
      <ListIconField {...itemProps.icon} />
      <Form.TextField
        {...itemProps.description}
        title={t("list.listDescription")}
        placeholder={t("list.listDescriptionPlaceholder")}
      />
      <Form.Dropdown {...itemProps.parentId} title={t("list.listParent")}>
        <Form.Dropdown.Item value="" title={t("list.listParentNone")} />
        {labelLists(lists || []).map(({ list: l, label }) => (
          <Form.Dropdown.Item key={l.id} value={l.id} title={l.icon ? `${l.icon} ${label}` : label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.type} title={t("list.listType")}>
        <Form.Dropdown.Item value="manual" title={t("list.listTypeManual")} />
        <Form.Dropdown.Item value="smart" title={t("list.listTypeSmart")} />
      </Form.Dropdown>
      {values.type === "smart" && (
        <Form.TextField
          {...itemProps.query}
          title={t("list.listQuery")}
          placeholder={t("list.listQueryPlaceholder")}
          info={t("list.listQueryDescription")}
        />
      )}
    </Form>
  );
}
