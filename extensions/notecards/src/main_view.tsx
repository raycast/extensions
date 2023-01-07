import { List, useNavigation } from "@raycast/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CardList from "./card_list";
import { Cards, deleteCard, getNoteCards, storeNewCard } from "./datastore";
import Form from "./edit_card_form";

export default function MainView() {
  const { push } = useNavigation();

  const queryClient = useQueryClient();
  const { data: cards, isLoading } = useQuery<Cards>({
    queryKey: ["cards"],
    queryFn: getNoteCards,
    refetchOnWindowFocus: false,
  });

  const storeNewCardMutation = useMutation({
    mutationFn: async ({ title, body, color }: { title: string; body: string; color: string }) => {
      return storeNewCard(title, body, color);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["cards"]);
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      return deleteCard(title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["cards"]);
    },
  });

  return isLoading ? (
    <List />
  ) : (
    <CardList
      listItems={cards ?? {}}
      onSelect={(title: string) =>
        push(
          <Form
            title={title}
            subtitle={cards?.[title]?.body ?? ""}
            color={cards?.[title]?.color ?? ""}
            onSubmit={(noteData) => {
              storeNewCardMutation.mutate(noteData);
            }}
          />
        )
      }
      onDelete={(title) => {
        deleteCardMutation.mutate({ title });
      }}
    />
  );
}
