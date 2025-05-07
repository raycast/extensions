import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { MutatePromise, showFailureToast } from "@raycast/utils";
import {
  CollectionList,
  CreateObjectForm,
  CreatePropertyForm,
  CreateTypeForm,
  ListSubmenu,
  ObjectDetail,
  TagList,
  TemplateList,
  UpdateObjectForm,
  UpdatePropertyForm,
  UpdateTypeForm,
  ViewType,
} from "..";
import { deleteObject, deleteProperty, deleteTag, deleteType, getRawObject, getRawType } from "../../api";
import {
  BodyFormat,
  Member,
  ObjectLayout,
  Property,
  Space,
  SpaceObject,
  SpaceObjectWithBody,
  Type,
  View,
} from "../../models";
import {
  addPinned,
  bundledPropKeys,
  localStorageKeys,
  moveDownInPinned,
  moveUpInPinned,
  pluralize,
  removePinned,
} from "../../utils";

type ObjectActionsProps = {
  space: Space;
  objectId: string;
  title: string;
  mutate?: MutatePromise<SpaceObject[] | Type[] | Property[] | Member[]>[];
  mutateTemplates?: MutatePromise<SpaceObject[]>;
  mutateObject?: MutatePromise<SpaceObjectWithBody | undefined>;
  mutateViews?: MutatePromise<View[]>;
  layout: ObjectLayout | undefined;
  object?: SpaceObject | SpaceObjectWithBody | Type | Property | Member;
  viewType: ViewType;
  isGlobalSearch: boolean;
  isNoPinView: boolean;
  isPinned: boolean;
  isDetailView?: boolean;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  searchText?: string;
};

export function ObjectActions({
  space,
  objectId,
  title,
  mutate,
  mutateTemplates,
  mutateObject,
  mutateViews,
  layout,
  object,
  viewType,
  isGlobalSearch,
  isNoPinView,
  isPinned,
  isDetailView,
  showDetails,
  onToggleDetails,
  searchText,
}: ObjectActionsProps) {
  const { pop, push } = useNavigation();
  const { primaryAction } = getPreferenceValues();
  const objectUrl = `anytype://object?objectId=${objectId}&spaceId=${space?.id}`;
  const pinSuffixForView = isGlobalSearch
    ? localStorageKeys.suffixForGlobalSearch
    : localStorageKeys.suffixForViewsPerSpace(space?.id, viewType);

  const isObject = viewType === ViewType.objects;
  const isType = viewType === ViewType.types;
  const isProperty = viewType === ViewType.properties;
  const isTag = viewType === ViewType.tags;
  const isMember = viewType === ViewType.members;

  const isList = layout === ObjectLayout.Set || layout === ObjectLayout.Collection;
  const isBookmark = layout === ObjectLayout.Bookmark;
  const hasTags =
    isProperty && ((object as Property).format === "select" || (object as Property).format === "multi_select");

  const getContextLabel = (isSingular = true) => (isDetailView || isSingular ? viewType : pluralize(2, viewType));

  async function handleCopyLink() {
    await Clipboard.copy(objectUrl);
    await showToast({
      title: "Link copied",
      message: `The ${getContextLabel().toLowerCase()} link has been copied to your clipboard.`,
      style: Toast.Style.Success,
    });
  }

  async function handleDeleteObject() {
    const confirm = await confirmAlert({
      title: `Delete ${getContextLabel()}`,
      message: `Are you sure you want to delete "${title}"?`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
    });

    if (confirm) {
      if (isDetailView) {
        pop(); // pop back to list view
      }
      try {
        if (isObject) {
          await deleteObject(space.id, objectId);
        } else if (isType) {
          await deleteType(space.id, objectId);
        } else if (isProperty) {
          await deleteProperty(space.id, objectId);
        } else if (isTag) {
          await deleteTag(space.id, "", objectId); // TODO: fix property Id
        } else {
          await deleteObject(space.id, objectId);
        }
        if (mutate) {
          for (const m of mutate) {
            await m();
          }
        }
        if (mutateTemplates) {
          await mutateTemplates();
        }
        if (mutateObject) {
          await mutateObject();
        }
        if (mutateViews) {
          await mutateViews();
        }
        await showToast({
          style: Toast.Style.Success,
          title: `${getContextLabel()} deleted`,
          message: `"${title}" has been deleted.`,
        });
      } catch (error) {
        await showFailureToast(error, { title: `Failed to delete ${getContextLabel()}` });
      }
    }
  }

  async function handleMoveUpInFavorites() {
    await moveUpInPinned(space.id, objectId, pinSuffixForView);
    if (mutate) {
      for (const m of mutate) {
        await m();
      }
    }
    await showToast({
      style: Toast.Style.Success,
      title: "Moved Up in Pinned",
    });
  }

  async function handleMoveDownInFavorites() {
    await moveDownInPinned(space.id, objectId, pinSuffixForView);
    if (mutate) {
      for (const m of mutate) {
        await m();
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Moved Down in Pinned",
    });
  }

  async function handlePin() {
    if (isPinned) {
      await removePinned(space.id, objectId, pinSuffixForView, title, getContextLabel());
    } else {
      await addPinned(space.id, objectId, pinSuffixForView, title, getContextLabel());
    }
    if (mutate) {
      for (const m of mutate) {
        await m();
      }
    }
  }

  async function handleRefresh() {
    const label = getContextLabel(false);
    await showToast({
      style: Toast.Style.Animated,
      title: `Refreshing ${label}...`,
    });
    try {
      if (mutate) {
        for (const m of mutate) {
          await m();
        }
      }
      if (mutateTemplates) {
        await mutateTemplates();
      }
      if (mutateObject) {
        await mutateObject();
      }

      await showToast({
        style: Toast.Style.Success,
        title: `${label} refreshed`,
      });
    } catch (error) {
      await showFailureToast(error, { title: `Failed to refresh ${label}` });
    }
  }

  //! Member management not enabled yet
  //   async function handleApproveMember(identity: string, name: string, role: UpdateMemberRole) {
  //     try {
  //       await updateMember(space.id, identity, { status: MemberStatus.Active, role });
  //       if (mutate) {
  //         for (const m of mutate) {
  //           await m();
  //         }
  //       }
  //       await showToast({
  //         style: Toast.Style.Success,
  //         title: `Member approved`,
  //         message: `${name} has been approved as ${formatMemberRole(role)}.`,
  //       });
  //     } catch (error) {
  //       await showFailureToast(error, { title: `Failed to approve member` });
  //     }
  //   }

  //   async function handleRejectMember(identity: string, name: string, spaceName: string) {
  //     const confirm = await confirmAlert({
  //       title: `Reject Member`,
  //       message: `Are you sure you want to reject ${name} from ${spaceName}?`,
  //       icon: { source: Icon.XMarkCircleHalfDash, tintColor: Color.Red },
  //     });

  //     if (confirm) {
  //       try {
  //         await updateMember(space.id, identity, { status: MemberStatus.Declined });
  //         if (mutate) {
  //           for (const m of mutate) {
  //             await m();
  //           }
  //         }
  //         await showToast({
  //           style: Toast.Style.Success,
  //           title: "Member rejected",
  //           message: `${name} has been rejected.`,
  //         });
  //       } catch (error) {
  //         await showFailureToast(error, { title: `Failed to reject member` });
  //       }
  //     }
  //   }

  //   async function handleRemoveMember(identity: string, memberName: string, spaceName: string) {
  //     const confirm = await confirmAlert({
  //       title: `Remove Member`,
  //       message: `Are you sure you want to remove ${memberName} from ${spaceName}?`,
  //       icon: { source: Icon.RemovePerson, tintColor: Color.Red },
  //     });

  //     if (confirm) {
  //       try {
  //         await updateMember(space.id, identity, { status: MemberStatus.Removed });
  //         if (mutate) {
  //           for (const m of mutate) {
  //             await m();
  //           }
  //         }
  //         await showToast({
  //           style: Toast.Style.Success,
  //           title: "Member removed",
  //           message: `${memberName} has been removed from ${spaceName}.`,
  //         });
  //       } catch (error) {
  //         await showFailureToast(error, { title: `Failed to remove member` });
  //       }
  //     }
  //   }

  //   async function handleChangeMemberRole(identity: string, name: string, role: UpdateMemberRole) {
  //     try {
  //       await updateMember(space.id, identity, { status: MemberStatus.Active, role });
  //       if (mutate) {
  //         for (const m of mutate) {
  //           await m();
  //         }
  //       }
  //       await showToast({
  //         style: Toast.Style.Success,
  //         title: `Role changed`,
  //         message: `${name} has been changed to ${formatMemberRole(role)}.`,
  //       });
  //     } catch (error) {
  //       await showFailureToast(error, { title: `Failed to change member role` });
  //     }
  //   }

  const canShowDetails = !isType && !isProperty && !isList && !isBookmark && !isDetailView;
  const showDetailsAction = canShowDetails && (
    <Action.Push
      icon={{ source: Icon.Sidebar }}
      title="Show Details"
      target={
        <ObjectDetail
          space={space}
          objectId={objectId}
          title={title}
          mutate={mutate}
          layout={layout}
          viewType={viewType}
          isGlobalSearch={isGlobalSearch}
          isPinned={isPinned}
        />
      }
    />
  );

  const openObjectAction = (
    <Action.OpenInBrowser
      icon={{ source: "../assets/anytype-icon.png" }}
      title={`Open ${getContextLabel()} in Anytype`}
      url={objectUrl}
    />
  );

  const firstPrimaryAction = primaryAction === "show_details" ? showDetailsAction : openObjectAction;
  const secondPrimaryAction = primaryAction === "show_details" ? openObjectAction : showDetailsAction;

  return (
    <ActionPanel title={title}>
      <ActionPanel.Section>
        {firstPrimaryAction}
        {isList && (
          <Action.Push
            icon={Icon.List}
            title="Show List"
            target={<CollectionList space={space} listId={objectId} listName={title} />}
          />
        )}
        {isType && (
          <Action.Push
            icon={Icon.BulletPoints}
            title="Show Type"
            target={
              <TemplateList space={space} typeId={objectId} isGlobalSearch={isGlobalSearch} isPinned={isPinned} />
            }
          />
        )}
        {hasTags && (
          <Action.Push icon={Icon.Tag} title="Show Tags" target={<TagList space={space} propertyId={objectId} />} />
        )}
        {isBookmark && (
          <Action
            icon={Icon.Bookmark}
            title="Open Bookmark in Browser"
            onAction={async () => {
              const url = (object as SpaceObject).properties.find((p) => p.key === bundledPropKeys.source)?.url;
              if (url) {
                open(url);
              } else {
                await showToast({
                  title: "Missing URL",
                  message: "Cannot open bookmark without a source URL.",
                  style: Toast.Style.Failure,
                });
              }
            }}
          />
        )}
        {secondPrimaryAction}
      </ActionPanel.Section>

      <ActionPanel.Section>
        {!isType && !isProperty && !isTag && !isMember && (
          <Action
            icon={Icon.Pencil}
            title={"Edit Object"}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={async () => {
              const { object } = await getRawObject(space.id, objectId, BodyFormat.Markdown);
              push(
                <UpdateObjectForm
                  spaceId={space.id}
                  object={object}
                  mutateObjects={mutate as MutatePromise<SpaceObject[]>[]}
                  mutateObject={mutateObject}
                />,
              );
            }}
          />
        )}
        {isType && (
          <Action
            icon={Icon.Pencil}
            title={"Edit Type"}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={async () => {
              const { type } = await getRawType(space.id, objectId);
              push(<UpdateTypeForm spaceId={space.id} type={type} mutateTypes={mutate as MutatePromise<Type[]>[]} />);
            }}
          />
        )}
        {isProperty && (
          <Action.Push
            icon={Icon.Pencil}
            title={"Edit Property"}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={
              <UpdatePropertyForm
                spaceId={space.id}
                property={object as Property}
                mutateProperties={mutate as MutatePromise<Property[]>[]}
              />
            }
          />
        )}
        {isDetailView && (
          <Action.CopyToClipboard
            title={`Copy Markdown`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            content={(object as SpaceObjectWithBody)?.markdown}
          />
        )}
        {!isType && !isProperty && <ListSubmenu spaceId={space.id} objectId={objectId} />}
        <Action
          icon={Icon.Link}
          title="Copy Link"
          shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
          onAction={handleCopyLink}
        />
        {!isDetailView && !isNoPinView && (
          <>
            <Action
              icon={isPinned ? Icon.StarDisabled : Icon.Star}
              title={isPinned ? `Unpin ${getContextLabel()}` : `Pin ${getContextLabel()}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              onAction={handlePin}
            />
            {isPinned && (
              <>
                <Action
                  icon={Icon.ArrowUp}
                  title="Move Up in Pinned" // eslint-disable-line @raycast/prefer-title-case
                  shortcut={{ modifiers: ["opt", "cmd"], key: "arrowUp" }}
                  onAction={handleMoveUpInFavorites}
                />
                <Action
                  icon={Icon.ArrowDown}
                  title="Move Down in Pinned" // eslint-disable-line @raycast/prefer-title-case
                  shortcut={{ modifiers: ["opt", "cmd"], key: "arrowDown" }}
                  onAction={handleMoveDownInFavorites}
                />
              </>
            )}
          </>
        )}
        {!isMember && (
          <Action
            icon={Icon.Trash}
            title={`Delete ${getContextLabel()}`}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={handleDeleteObject}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        {!isMember && (
          <Action
            icon={Icon.Plus}
            title={`Create ${getContextLabel()}`}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() => {
              if (isType) {
                push(<CreateTypeForm draftValues={{ space: space.id, name: searchText || "" }} />);
              } else if (isProperty) {
                push(<CreatePropertyForm spaceId={space.id} draftValues={{ name: searchText || "" }} />);
              } else {
                push(<CreateObjectForm draftValues={{ spaceId: space.id, name: searchText }} enableDrafts={false} />);
              }
            }}
          />
        )}
        {isDetailView && (
          <Action
            icon={showDetails ? Icon.EyeDisabled : Icon.Eye}
            title={showDetails ? "Hide Sidebar" : "Show Sidebar"}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetails}
          />
        )}
        <Action
          icon={Icon.RotateClockwise}
          title={`Refresh ${getContextLabel(false)}`}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={handleRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
