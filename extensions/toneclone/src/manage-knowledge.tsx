import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
  showHUD,
  closeMainWindow,
  Icon,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { KnowledgeCard } from "./types";
import AuthenticationGate from "./components/AuthenticationGate";
import { ErrorBoundary } from "./components/ErrorBoundary";

interface KnowledgeCardFormValues {
  knowledgeCardId: string;
  instructions: string;
}

interface NewKnowledgeCardFormValues {
  name: string;
  instructions: string;
}

function NewKnowledgeCardForm({
  onKnowledgeCardCreated,
}: {
  onKnowledgeCardCreated: (knowledgeCard: KnowledgeCard) => void;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: NewKnowledgeCardFormValues) => {
      if (!values.name?.trim() || !values.instructions?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Name and instructions are required",
        });
        return;
      }

      try {
        setIsSubmitting(true);

        await showToast({
          style: Toast.Style.Animated,
          title: "Creating Knowledge Card",
          message: "Creating your new knowledge card...",
        });

        const newKnowledgeCard = await api.createKnowledgeCard(values.name.trim(), values.instructions.trim());

        await showToast({
          style: Toast.Style.Success,
          title: "Knowledge Card Created",
          message: `"${newKnowledgeCard.name}" has been created`,
        });

        onKnowledgeCardCreated(newKnowledgeCard);
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Create Knowledge Card",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [onKnowledgeCardCreated, pop],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Knowledge Card"
            onSubmit={handleSubmit}
            icon={Icon.Check}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Cancel"
            onAction={pop}
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.TextField
        id="name"
        title="Knowledge Card Name"
        placeholder="Enter knowledge card name"
        info="A descriptive name for this knowledge card"
      />

      <Form.TextArea
        id="instructions"
        title="Knowledge Card Instructions"
        placeholder="Enter the knowledge card instructions..."
        info="The instructions that define this knowledge card"
      />
    </Form>
  );
}

function KnowledgeManager() {
  const [knowledgeCards, setKnowledgeCards] = useState<KnowledgeCard[]>([]);
  const [selectedKnowledgeCardId, setSelectedKnowledgeCardId] = useState<string>("");
  const [selectedKnowledgeCard, setSelectedKnowledgeCard] = useState<KnowledgeCard | null>(null);
  const [knowledgeCardInstructions, setKnowledgeCardInstructions] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { push } = useNavigation();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const knowledgeCardsData = await api.getKnowledgeCards();

      setKnowledgeCards(knowledgeCardsData);

      if (knowledgeCardsData.length > 0 && !selectedKnowledgeCardId) {
        const firstKnowledgeCard = knowledgeCardsData[0];
        setSelectedKnowledgeCardId(firstKnowledgeCard.knowledgeCardId);
        setSelectedKnowledgeCard(firstKnowledgeCard);
        setKnowledgeCardInstructions(firstKnowledgeCard.instructions);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load knowledge",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedKnowledgeCardId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleKnowledgeCardChange = useCallback(
    (knowledgeCardId: string) => {
      const knowledgeCard = knowledgeCards.find((k) => k.knowledgeCardId === knowledgeCardId);
      if (!knowledgeCard) return;

      setSelectedKnowledgeCardId(knowledgeCardId);
      setSelectedKnowledgeCard(knowledgeCard);
      setKnowledgeCardInstructions(knowledgeCard.instructions);
    },
    [knowledgeCards],
  );

  const handleSubmit = useCallback(
    async (values: KnowledgeCardFormValues) => {
      if (!selectedKnowledgeCard) return;

      if (!values.instructions?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Knowledge card instructions are required",
        });
        return;
      }

      try {
        setIsSubmitting(true);

        await showToast({
          style: Toast.Style.Animated,
          title: "Saving Knowledge Card",
          message: "Updating knowledge card instructions...",
        });

        // Update knowledge card instructions (include name even though unchanged)
        await api.updateKnowledgeCard(
          selectedKnowledgeCard.knowledgeCardId,
          selectedKnowledgeCard.name,
          values.instructions.trim(),
        );

        // Update local state
        setSelectedKnowledgeCard({ ...selectedKnowledgeCard, instructions: values.instructions.trim() });

        await showHUD(`✅ Knowledge card "${selectedKnowledgeCard.name}" updated`);
        await closeMainWindow();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Save Knowledge Card",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedKnowledgeCard],
  );

  const handleDeleteKnowledgeCard = useCallback(async () => {
    if (!selectedKnowledgeCard) return;

    const confirmed = await confirmAlert({
      title: "Delete Knowledge Card",
      message: `Are you sure you want to delete "${selectedKnowledgeCard.name}"? This cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Deleting Knowledge Card",
          message: `Deleting "${selectedKnowledgeCard.name}"...`,
        });

        await api.deleteKnowledgeCard(selectedKnowledgeCard.knowledgeCardId);

        await showHUD(`✅ Knowledge card "${selectedKnowledgeCard.name}" deleted`);
        await closeMainWindow();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Delete Knowledge Card",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }, [selectedKnowledgeCard]);

  const handleAddNewKnowledgeCard = useCallback(() => {
    push(
      <NewKnowledgeCardForm
        onKnowledgeCardCreated={(newKnowledgeCard) => {
          setKnowledgeCards((prev) => [...prev, newKnowledgeCard]);
          setSelectedKnowledgeCardId(newKnowledgeCard.knowledgeCardId);
          setSelectedKnowledgeCard(newKnowledgeCard);
          setKnowledgeCardInstructions(newKnowledgeCard.instructions);
        }}
      />,
    );
  }, [push]);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading knowledge..." />;
  }

  if (knowledgeCards.length === 0) {
    return (
      <Detail
        markdown="# No Knowledge Found

You haven't created any knowledge cards yet.

Knowledge cards define specific writing styles and instructions that can be used with your personas."
        actions={
          <ActionPanel>
            <Action
              title="Add New Knowledge Card"
              onAction={handleAddNewKnowledgeCard}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Knowledge Card"
            onSubmit={handleSubmit}
            icon={Icon.SaveDocument}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <ActionPanel.Section title="Knowledge Management">
            <Action
              title="Add New Knowledge Card"
              onAction={handleAddNewKnowledgeCard}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="Delete Knowledge Card"
              onAction={handleDeleteKnowledgeCard}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Dropdown
        id="knowledgeCardId"
        title="Knowledge Card"
        value={selectedKnowledgeCardId}
        onChange={handleKnowledgeCardChange}
        info="Select the knowledge card to edit"
      >
        {knowledgeCards.map((knowledgeCard) => (
          <Form.Dropdown.Item
            key={knowledgeCard.knowledgeCardId}
            value={knowledgeCard.knowledgeCardId}
            title={knowledgeCard.name}
            icon={Icon.Document}
          />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="instructions"
        title="Knowledge Card Instructions"
        value={knowledgeCardInstructions}
        onChange={setKnowledgeCardInstructions}
        placeholder="Enter the knowledge card instructions..."
        info="The instructions that define this knowledge card"
      />
    </Form>
  );
}

function Command() {
  return (
    <ErrorBoundary fallbackTitle="Knowledge Management Error">
      <AuthenticationGate>
        <KnowledgeManager />
      </AuthenticationGate>
    </ErrorBoundary>
  );
}

export default Command;
