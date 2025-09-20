import { useEffect, useState } from "react";
import { Rewrite, RewriteCreate, RewriteEdit } from "./utils/types";
import { createDomainRewrite, deleteDomainRewrite, editDomainRewrite, getDomainRewrites } from "./utils/api";
import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import DomainSelector from "./components/DomainSelector";

export default function Rewrites() {
  const { push } = useNavigation();
  const handleDomainSelected = (domain: string) => push(<RewritesIndex domain={domain} />);
  return <DomainSelector onDomainSelected={handleDomainSelected} />;
}

function RewritesIndex({ domain }: { domain: string }) {
  const { push } = useNavigation();
  const [rewrites, setRewrites] = useCachedState<Rewrite[]>("rewrites", [], {
    cacheNamespace: domain,
  });
  const [isLoading, setIsLoading] = useState(true);

  async function getDomainRewritesFromApi() {
    setIsLoading(true);
    const response = await getDomainRewrites(domain);
    if (!("error" in response)) setRewrites(response.rewrites);
    setIsLoading(false);
  }

  useEffect(() => {
    getDomainRewritesFromApi();
  }, []);

  async function confirmAndDelete(rewrite: Rewrite) {
    if (
      await confirmAlert({
        title: `Delete '${rewrite.name}'?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const response = await deleteDomainRewrite(domain, rewrite.name);
      if (!("error" in response)) {
        await showToast(Toast.Style.Success, "Deleted Rewrite", `${response.name}`);
        await getDomainRewritesFromApi();
      }
      setIsLoading(false);
    }
  }

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      navigationTitle="Edit Rewrite"
      searchBarPlaceholder="Search rewrite..."
      actions={
        <ActionPanel>
          <Action
            title="Create New Rewrite"
            icon={Icon.Forward}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<RewritesCreate domain={domain} onRewriteCreated={getDomainRewritesFromApi} />)}
          />
          <Action
            title="Reload Rewrites"
            icon={Icon.Redo}
            shortcut={{ modifiers: ["opt"], key: "r" }}
            onAction={getDomainRewritesFromApi}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`${rewrites.length} ${rewrites.length === 1 ? "rewrite" : "rewrites"}`}>
        {rewrites.map((rewrite) => (
          <List.Item
            key={rewrite.name}
            title={rewrite.name}
            icon={Icon.Forward}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Rewrite"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(<RewritesEdit domain={domain} rewrite={rewrite} onRewriteEdited={getDomainRewritesFromApi} />)
                  }
                />
                <Action
                  title="Delete Rewrite"
                  icon={Icon.Minus}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(rewrite)}
                />
                <Action
                  title="Create New Rewrite"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<RewritesCreate domain={domain} onRewriteCreated={getDomainRewritesFromApi} />)}
                />
                <Action
                  title="Reload Rewrites"
                  icon={Icon.Redo}
                  shortcut={{ modifiers: ["opt"], key: "r" }}
                  onAction={getDomainRewritesFromApi}
                />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Order" text={rewrite.order_num.toString()} />
                    <List.Item.Detail.Metadata.Label title="Name" text={rewrite.name} />
                    <List.Item.Detail.Metadata.Label title="Pattern" text={`${rewrite.local_part_rule}@${domain}`} />
                    <List.Item.Detail.Metadata.Label title="Destinations" text={rewrite.destinations.join()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create New Rewrite"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Create New Rewrite"
                  icon={Icon.Plus}
                  onAction={() => push(<RewritesCreate domain={domain} onRewriteCreated={getDomainRewritesFromApi} />)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Reload Rewrites"
            icon={Icon.Redo}
            actions={
              <ActionPanel>
                <Action title="Reload Rewrites" icon={Icon.Redo} onAction={getDomainRewritesFromApi} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type RewritesCreateProps = {
  domain: string;
  onRewriteCreated: () => void;
};
function RewritesCreate({ domain, onRewriteCreated }: RewritesCreateProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<RewriteCreate>({
    async onSubmit(values) {
      setIsLoading(true);

      const newRewrite: RewriteCreate = { ...values };

      const response = await createDomainRewrite(domain, newRewrite);
      if (!("error" in response)) {
        showToast(
          Toast.Style.Success,
          "Created Rewrite",
          `${response.local_part_rule} -> ${response.destinations.join()}`,
        );
        onRewriteCreated();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      name: FormValidation.Required,
      local_part_rule(value) {
        if (!value) return "The item is required";
        else if (!value.includes("*")) return "The item must include at least 1 asterik";
      },
      destinations: FormValidation.Required,
    },
  });
  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create New Rewrite"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />

      <Form.Separator />
      <Form.TextField
        title="Name"
        placeholder="3rd party signups"
        info="Wildcard rewrites use patterns to match a class of addresses. Since wildcards can easily look cryptic, please give the rewrite a name."
        {...itemProps.name}
      />
      <Form.TextField
        title="Pattern"
        placeholder="signup-*"
        info={`The pattern must include one or multiple asterisks (*) to be valid. For example "*.family" would match messages sent to "dad.family" and "anna.family" and could be sent to "family" mailbox.`}
        {...itemProps.local_part_rule}
      />
      <Form.Description text={`${itemProps.local_part_rule.value || "[RULE(S)]"}@${domain}`} />
      <Form.TextField
        title="Local Recipients"
        placeholder={`rewrite1@${domain},rewrite2@${domain}`}
        info="Be careful not to create a circular rewrite by forwarding to addresses which match the pattern above. Such circulars can significantly delay your incoming messages."
        {...itemProps.destinations}
      />
    </Form>
  );
}

type RewritesEditProps = {
  domain: string;
  rewrite: Rewrite;
  onRewriteEdited: () => void;
};
function RewritesEdit({ domain, rewrite, onRewriteEdited }: RewritesEditProps) {
  const { pop } = useNavigation();

  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<RewriteEdit>({
    async onSubmit(values) {
      setIsLoading(true);

      const modifiedRewrite: RewriteEdit = { ...values };

      const response = await editDomainRewrite(domain, rewrite.name, modifiedRewrite);
      if (!("error" in response)) {
        await showToast(Toast.Style.Success, "Edited Rewrite", `${response.name} -> ${response.destinations.join()}`);
        onRewriteEdited();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      name: FormValidation.Required,
      local_part_rule(value) {
        if (!value) return "The item is required";
        else if (!value.includes("*")) return "The item must include at least 1 asterik";
      },
      destinations: FormValidation.Required,
    },
    initialValues: {
      name: rewrite.name,
      local_part_rule: rewrite.local_part_rule,
      destinations: rewrite.destinations.join(),
    },
  });
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.Description title="Rewrite" text={rewrite.name} />

      <Form.Separator />
      <Form.TextField
        title="Name"
        placeholder="3rd party signups"
        info="Wildcard rewrites use patterns to match a class of addresses. Since wildcards can easily look cryptic, please give the rewrite a name."
        {...itemProps.name}
      />
      <Form.TextField
        title="Pattern"
        placeholder="signup-*"
        info={`The pattern must include one or multiple asterisks (*) to be valid. For example "*.family" would match messages sent to "dad.family" and "anna.family" and could be sent to "family" mailbox.`}
        {...itemProps.local_part_rule}
      />
      <Form.Description text={`${itemProps.local_part_rule.value || "[RULE(S)]"}@${domain}`} />
      <Form.TextField
        title="Local Recipients"
        placeholder={`rewrite1@${domain},rewrite2@${domain}`}
        info="Be careful not to create a circular rewrite by forwarding to addresses which match the pattern above. Such circulars can significantly delay your incoming messages."
        {...itemProps.destinations}
      />
    </Form>
  );
}
