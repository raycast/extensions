import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Grid,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useState } from "react";
import { Insight } from "./utils/types";
import { publishInsight } from "./utils/api";
import ErrorComponent from "./components/ErrorComponent";
import { API_DOCS_URL } from "./utils/constants";

export default function Insight() {
  const { push } = useNavigation();
  const [insights, setInsights] = useCachedState<Insight[]>("insights", []);
  const [isLoading, setIsLoading] = useState(false);

  async function confirmAndRemove(insight: Insight, insightIndex: number) {
    if (
      await confirmAlert({
        title: `Remove '${insight.title}'?`,
        message: `This will NOT remove the insight from your LogSnag Dashboard.`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const newInsights = insights;
      newInsights.splice(insightIndex, 1);
      setInsights([...newInsights]);
      setIsLoading(false);
    }
  }

  function addInsight(insight: Insight) {
    const newInsights = insights;
    const insightIndex = newInsights.findIndex((i) => i.title === insight.title && i.project === insight.project);

    if (insightIndex !== -1) {
      newInsights[insightIndex].icon = insight.icon || newInsights[insightIndex].icon;
      newInsights[insightIndex].value = insight.value;
      setInsights([...newInsights]);
    } else {
      setInsights([...newInsights, insight]);
    }
  }

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search insight">
      {insights.length === 0 ? (
        <Grid.EmptyView
          title="No insight found"
          icon={"no-insight.svg"}
          description="Please publish an insight to get started."
          actions={
            <ActionPanel>
              <Action
                title="Publish New Insight"
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                icon={Icon.Plus}
                onAction={() => push(<PublishInsight onInsightPublished={(insight: Insight) => addInsight(insight)} />)}
              />
              <Action.OpenInBrowser title="View API Reference" url={`${API_DOCS_URL}endpoints/insight`} />
            </ActionPanel>
          }
        />
      ) : (
        !isLoading &&
        insights.map((insight, insightIndex) => (
          <Grid.Item
            title={insight.value}
            subtitle={`${insight.title} (${insight.project})`}
            key={insightIndex}
            keywords={[insight.project, insight.title]}
            content={insight.icon || "🔔"}
            actions={
              <ActionPanel>
                <Action
                  title="Remove Insight"
                  icon={Icon.Eraser}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndRemove(insight, insightIndex)}
                />
                <ActionPanel.Section>
                  <Action
                    title="Publish New Insight"
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    icon={Icon.Plus}
                    onAction={() => push(<PublishInsight onInsightPublished={(insight) => addInsight(insight)} />)}
                  />
                  <Action.OpenInBrowser title="View API Reference" url="https://docs.logsnag.com/endpoints/log" />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}

type PublishInsightProps = {
  onInsightPublished: (insight: Insight) => void;
};
export function PublishInsight({ onInsightPublished }: PublishInsightProps) {
  const { push, pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<Insight>({
    async onSubmit(values) {
      setIsLoading(true);

      const insightOptions = { ...values };
      if (!values.icon) delete insightOptions.icon;
      const response = await publishInsight({ ...insightOptions });

      if (!("message" in response)) {
        showToast(Toast.Style.Success, "Published Successfully");
        onInsightPublished(response);
        pop();
      } else {
        push(<ErrorComponent errorResponse={response} />);
      }
      setIsLoading(false);
    },
    validation: {
      project: FormValidation.Required,
      title: FormValidation.Required,
      value: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.project}
        title="Project"
        info="Project name - make sure Project exists in LogSnag dashboard"
        placeholder="makershq"
      />
      <Form.TextField {...itemProps.title} title="Title" placeholder="MRR" />
      <Form.TextField {...itemProps.value} title="Value" placeholder="$200" />
      <Form.TextField
        title="Icon"
        placeholder="🔔 | :bell:"
        {...itemProps.icon}
        info="Icon must be a single valid emoji"
      />
      <Form.Description text="EMOJI TIP: Enter ':' above to access Emoji Picker" />
    </Form>
  );
}
