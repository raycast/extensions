import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ProfileEditorForm } from "./components/profile-editor-form";
import {
  buildProfileFromDraft,
  maskApiKey,
  readProfileStore,
  toProfileDraft,
  writeProfileStore,
} from "./services/profile-store";
import { getErrorMessage } from "./services/error-utils";
import { ApiProfile, ProfileStoreData } from "./types/profile";

const COPY_PROFILE_NAME_SUFFIX = " - Copy";

interface ProfileStoreState {
  store: ProfileStoreData;
  isLoading: boolean;
  error: string | null;
}

function ensureDefaultProfileId(store: ProfileStoreData): ProfileStoreData {
  if (!store.profiles.length) {
    return { profiles: [], defaultProfileId: null };
  }

  const hasDefault = store.defaultProfileId
    ? store.profiles.some((profile) => profile.id === store.defaultProfileId)
    : false;
  return {
    profiles: store.profiles,
    defaultProfileId: hasDefault
      ? store.defaultProfileId
      : store.profiles[0].id,
  };
}

function moveProfile(
  profiles: ApiProfile[],
  profileId: string,
  offset: -1 | 1,
): ApiProfile[] {
  const currentIndex = profiles.findIndex(
    (profile) => profile.id === profileId,
  );
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= profiles.length) {
    return profiles;
  }

  const movedProfiles = [...profiles];
  const [profile] = movedProfiles.splice(currentIndex, 1);
  movedProfiles.splice(nextIndex, 0, profile);
  return movedProfiles;
}

function useProfileStoreState() {
  const [state, setState] = useState<ProfileStoreState>({
    store: { profiles: [], defaultProfileId: null },
    isLoading: true,
    error: null,
  });

  const reload = useCallback(async () => {
    try {
      const store = await readProfileStore();
      setState({ store, isLoading: false, error: null });
    } catch (error) {
      setState({
        store: { profiles: [], defaultProfileId: null },
        isLoading: false,
        error: getErrorMessage(error),
      });
    }
  }, []);

  const persist = useCallback(async (store: ProfileStoreData) => {
    const normalizedStore = ensureDefaultProfileId(store);
    await writeProfileStore(normalizedStore);
    setState({ store: normalizedStore, isLoading: false, error: null });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { state, persist };
}

function buildProfileSubtitle(profile: ApiProfile): string {
  const profileState = profile.enabled ? "Enabled" : "Disabled";
  return `${profile.model} · ${profile.baseUrl} · ${profileState}`;
}

function getProfileIcon(isDefault: boolean): {
  source: Icon;
  tintColor?: string;
} {
  if (isDefault) {
    return { source: Icon.Star, tintColor: "#f5c542" };
  }

  return { source: Icon.Network };
}

function buildAccessories(
  profile: ApiProfile,
  isDefault: boolean,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    { text: maskApiKey(profile.apiKey) },
  ];
  if (isDefault) {
    accessories.unshift({ tag: "Default" });
  }

  return accessories;
}

function useCreateProfileAction(params: {
  store: ProfileStoreData;
  persist: (store: ProfileStoreData) => Promise<void>;
  push: (component: ReactElement) => void;
}) {
  const { store, persist, push } = params;
  return useCallback(() => {
    push(
      <ProfileEditorForm
        title="Create API Profile"
        initialDraft={toProfileDraft()}
        onSubmit={async (draft) => {
          const profile = buildProfileFromDraft(draft);
          await persist({
            profiles: [...store.profiles, profile],
            defaultProfileId: store.defaultProfileId,
          });
        }}
      />,
    );
  }, [persist, push, store.defaultProfileId, store.profiles]);
}

function useEditProfileAction(params: {
  store: ProfileStoreData;
  persist: (store: ProfileStoreData) => Promise<void>;
  push: (component: ReactElement) => void;
}) {
  const { store, persist, push } = params;
  return useCallback(
    (profile: ApiProfile) => {
      push(
        <ProfileEditorForm
          title={`Edit ${profile.name}`}
          initialDraft={toProfileDraft(profile)}
          onSubmit={async (draft) => {
            const updatedProfile = buildProfileFromDraft(draft, profile.id);
            const profiles = store.profiles.map((item) =>
              item.id === profile.id ? updatedProfile : item,
            );
            await persist({
              profiles,
              defaultProfileId: store.defaultProfileId,
            });
          }}
        />,
      );
    },
    [persist, push, store.defaultProfileId, store.profiles],
  );
}

function useCreateFromProfileAction(params: {
  store: ProfileStoreData;
  persist: (store: ProfileStoreData) => Promise<void>;
  push: (component: ReactElement) => void;
}) {
  const { store, persist, push } = params;
  return useCallback(
    (sourceProfile: ApiProfile) => {
      const draft = toProfileDraft(sourceProfile);
      push(
        <ProfileEditorForm
          title={`Create from ${sourceProfile.name}`}
          initialDraft={{
            ...draft,
            name: `${sourceProfile.name}${COPY_PROFILE_NAME_SUFFIX}`,
          }}
          onSubmit={async (nextDraft) => {
            const profile = buildProfileFromDraft(nextDraft);
            await persist({
              profiles: [...store.profiles, profile],
              defaultProfileId: store.defaultProfileId,
            });
          }}
        />,
      );
    },
    [persist, push, store.defaultProfileId, store.profiles],
  );
}

function useSimpleProfileActions(
  store: ProfileStoreData,
  persist: (store: ProfileStoreData) => Promise<void>,
) {
  const setDefaultProfile = useCallback(
    async (profileId: string) => {
      await persist({ profiles: store.profiles, defaultProfileId: profileId });
    },
    [persist, store.profiles],
  );

  const toggleProfileEnabled = useCallback(
    async (profileId: string) => {
      const profiles = store.profiles.map((profile) =>
        profile.id === profileId
          ? { ...profile, enabled: !profile.enabled }
          : profile,
      );
      await persist({ profiles, defaultProfileId: store.defaultProfileId });
    },
    [persist, store.defaultProfileId, store.profiles],
  );

  const move = useCallback(
    async (profileId: string, offset: -1 | 1) => {
      const profiles = moveProfile(store.profiles, profileId, offset);
      await persist({ profiles, defaultProfileId: store.defaultProfileId });
    },
    [persist, store.defaultProfileId, store.profiles],
  );

  return { setDefaultProfile, toggleProfileEnabled, move };
}

function useDeleteProfileAction(
  store: ProfileStoreData,
  persist: (store: ProfileStoreData) => Promise<void>,
) {
  return useCallback(
    async (profileId: string) => {
      const confirmed = await confirmAlert({
        title: "Delete Profile",
        message: "This profile will be removed permanently.",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) {
        return;
      }

      const profiles = store.profiles.filter(
        (profile) => profile.id !== profileId,
      );
      const defaultProfileId =
        store.defaultProfileId === profileId ? null : store.defaultProfileId;
      await persist({ profiles, defaultProfileId });
    },
    [persist, store.defaultProfileId, store.profiles],
  );
}

function ProfileListItem(props: {
  profile: ApiProfile;
  index: number;
  total: number;
  isDefault: boolean;
  onCreate: () => void;
  onCreateFrom: (profile: ApiProfile) => void;
  onEdit: (profile: ApiProfile) => void;
  onSetDefault: (profileId: string) => Promise<void>;
  onToggleEnabled: (profileId: string) => Promise<void>;
  onDelete: (profileId: string) => Promise<void>;
  onMove: (profileId: string, offset: -1 | 1) => Promise<void>;
}) {
  const { profile, index, total, isDefault } = props;
  const enableTitle = profile.enabled ? "Disable Profile" : "Enable Profile";
  return (
    <List.Item
      icon={getProfileIcon(isDefault)}
      title={profile.name}
      subtitle={buildProfileSubtitle(profile)}
      accessories={buildAccessories(profile, isDefault)}
      actions={
        <ActionPanel>
          <Action
            title="Create Profile"
            icon={Icon.Plus}
            onAction={props.onCreate}
          />
          <Action
            title="Edit Profile"
            icon={Icon.Pencil}
            onAction={() => props.onEdit(profile)}
          />
          <Action
            title="Create from This Profile"
            icon={Icon.Clipboard}
            onAction={() => props.onCreateFrom(profile)}
          />
          <Action
            title="Set as Default"
            icon={Icon.Star}
            onAction={() => props.onSetDefault(profile.id)}
          />
          <Action
            title={enableTitle}
            icon={Icon.Checkmark}
            onAction={() => props.onToggleEnabled(profile.id)}
          />
          <Action
            title="Move Profile up"
            icon={Icon.ArrowUp}
            onAction={() => props.onMove(profile.id, -1)}
            disabled={index === 0}
          />
          <Action
            title="Move Profile Down"
            icon={Icon.ArrowDown}
            onAction={() => props.onMove(profile.id, 1)}
            disabled={index === total - 1}
          />
          <Action
            title="Delete Profile"
            style={Action.Style.Destructive}
            icon={Icon.Trash}
            onAction={() => props.onDelete(profile.id)}
          />
        </ActionPanel>
      }
    />
  );
}

export default function ManageApiProfiles() {
  const { push } = useNavigation();
  const { state, persist } = useProfileStoreState();
  const createProfile = useCreateProfileAction({
    store: state.store,
    persist,
    push,
  });
  const createFromProfile = useCreateFromProfileAction({
    store: state.store,
    persist,
    push,
  });
  const editProfile = useEditProfileAction({
    store: state.store,
    persist,
    push,
  });
  const { setDefaultProfile, toggleProfileEnabled, move } =
    useSimpleProfileActions(state.store, persist);
  const deleteProfile = useDeleteProfileAction(state.store, persist);
  const profiles = useMemo(() => state.store.profiles, [state.store.profiles]);

  if (state.error) {
    return (
      <List isLoading={false} searchBarPlaceholder="Manage API profiles">
        <List.EmptyView
          title="Failed to load profiles"
          description={state.error}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Manage API profiles"
    >
      {profiles.length === 0 ? (
        <List.EmptyView
          title="No Profiles"
          description="Create your first API profile."
        />
      ) : null}

      {profiles.map((profile, index) => (
        <ProfileListItem
          key={profile.id}
          profile={profile}
          index={index}
          total={profiles.length}
          isDefault={state.store.defaultProfileId === profile.id}
          onCreate={createProfile}
          onCreateFrom={createFromProfile}
          onEdit={editProfile}
          onSetDefault={setDefaultProfile}
          onToggleEnabled={toggleProfileEnabled}
          onDelete={deleteProfile}
          onMove={move}
        />
      ))}

      <List.Item
        key="create-profile"
        icon={Icon.PlusCircle}
        title="Create New Profile"
        actions={
          <ActionPanel>
            <Action
              title="Create Profile"
              icon={Icon.Plus}
              onAction={createProfile}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
