import { Action, ActionPanel, Form, Icon, showHUD, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchCreateList } from "./apis";
import { QueryBuilderActions } from "./components/QueryBuilderActions";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useTranslation } from "./hooks/useTranslation";
import { List } from "./types";
import { isEmoji, makeSmartQueryValidator } from "./utils/formatting";
import { runWithToast } from "./utils/toast";

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
  const { lists } = useGetAllLists();

  const { handleSubmit, itemProps, setValue, values } = useForm<ListFormValues>({
    initialValues: { name: "", icon: "", description: "", parentId: "", type: "manual", query: "" },
    validation: {
      name: (value) => (!value?.trim() ? t("list.listName") + " is required" : undefined),
      icon: (value) => (!isEmoji(value || "") ? "Must be a valid emoji" : undefined),
      query: makeSmartQueryValidator(t),
    },
    async onSubmit(values) {
      log.info("Creating list", { name: values.name, type: values.type, query: values.query || undefined });

      const payload = {
        name: values.name.trim(),
        icon: values.icon.trim() || undefined,
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
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("list.createList")} onSubmit={handleSubmit} icon={Icon.Plus} />
          {values.type === "smart" && (
            <QueryBuilderActions query={values.query} onInsert={(q) => setValue("query", q)} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title={t("list.listName")}
        placeholder={t("list.listNamePlaceholder")}
        autoFocus
      />
      <Form.TextField {...itemProps.icon} title={t("list.listIcon")} placeholder={t("list.listIconPlaceholder")} />
      <Form.TextField
        {...itemProps.description}
        title={t("list.listDescription")}
        placeholder={t("list.listDescriptionPlaceholder")}
      />
      <Form.Dropdown {...itemProps.parentId} title={t("list.listParent")}>
        <Form.Dropdown.Item value="" title={t("list.listParentNone")} />
        {(lists || []).map((l) => (
          <Form.Dropdown.Item key={l.id} value={l.id} title={l.icon ? `${l.icon} ${l.name}` : l.name} />
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
