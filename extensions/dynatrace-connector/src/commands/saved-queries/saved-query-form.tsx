// Saved Query Form — create and edit saved queries
import { Form, Action, ActionPanel, showToast, Toast, useNavigation } from "@raycast/api";
import { useState, useEffect } from "react";
import { saveSavedQuery, getSavedQuery } from "../../lib/savedQueries";
import { getActiveTenant } from "../../lib/tenants";

interface SavedQueryFormProps {
  queryId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

interface FormValues {
  name: string;
  dql: string;
  timeframe: string;
}

export default function SavedQueryForm({ queryId, onSave, onCancel }: SavedQueryFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<FormValues | null>(null);

  useEffect(() => {
    const init = async () => {
      if (queryId) {
        const query = await getSavedQuery(queryId);
        if (query) {
          setInitialValues({
            name: query.name,
            dql: query.dql,
            timeframe: query.timeframe,
          });
        }
      }
    };
    init();
  }, [queryId]);

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);

    try {
      const tenant = await getActiveTenant();
      const savedQuery = await saveSavedQuery(
        {
          name: values.name,
          dql: values.dql,
          timeframe: values.timeframe,
          isFavorite: false,
          tenantId: tenant?.id,
        },
        queryId,
      );

      await showToast({
        style: Toast.Style.Success,
        title: "Saved",
        message: `Query "${savedQuery.name}" saved successfully`,
      });

      onSave?.();
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Save failed",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading || initialValues === null}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={queryId ? "Save Changes" : "Create Query"} onSubmit={handleSubmit} />
          {onCancel && (
            <Action
              title="Cancel"
              onAction={() => {
                onCancel();
                pop();
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Query Name" placeholder="My custom query" defaultValue={initialValues?.name} />

      <Form.TextArea
        id="dql"
        title="DQL Query"
        placeholder="fetch dt.entity.service | limit 10"
        defaultValue={initialValues?.dql}
      />

      <Form.TextField
        id="timeframe"
        title="Timeframe"
        placeholder="last 1h"
        defaultValue={initialValues?.timeframe}
        info="e.g. 'last 1h', 'last 7d', or ISO timestamps"
      />
    </Form>
  );
}
