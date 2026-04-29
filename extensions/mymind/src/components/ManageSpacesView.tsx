import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { addObjectToSpace, listSpaces, MyMindObject, removeObjectFromSpace, Space } from "../api";

export function ManageSpacesView({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  const { isLoading, data: spaces = [] } = useCachedPromise(listSpaces, []);
  const [memberIds, setMemberIds] = useState<Set<string>>(() => new Set(object.spaces.map((s) => s.id)));
  const [pending, setPending] = useState<Set<string>>(new Set());

  const toggle = async (space: Space) => {
    if (pending.has(space.id)) return;
    setPending((prev) => new Set(prev).add(space.id));

    const isMember = memberIds.has(space.id);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: isMember ? "Removing…" : "Adding…",
    });

    try {
      if (isMember) {
        await removeObjectFromSpace(space.id, object.id);
        setMemberIds((prev) => {
          const next = new Set(prev);
          next.delete(space.id);
          return next;
        });
      } else {
        await addObjectToSpace(space.id, object.id);
        setMemberIds((prev) => new Set(prev).add(space.id));
      }
      toast.style = Toast.Style.Success;
      toast.title = isMember ? `Removed from ${space.name}` : `Added to ${space.name}`;
      onChange?.();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed" });
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(space.id);
        return next;
      });
    }
  };

  return (
    <List isLoading={isLoading} navigationTitle="Manage Spaces" searchBarPlaceholder="Filter spaces…">
      {spaces.map((space) => {
        const isMember = memberIds.has(space.id);
        return (
          <List.Item
            key={space.id}
            icon={{
              source: isMember ? Icon.CheckCircle : Icon.Circle,
              tintColor: space.color ?? undefined,
            }}
            title={space.name}
            accessories={isMember ? [{ tag: { value: "Member" } }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title={isMember ? "Remove from Space" : "Add to Space"}
                  icon={isMember ? Icon.Minus : Icon.Plus}
                  onAction={() => toggle(space)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
