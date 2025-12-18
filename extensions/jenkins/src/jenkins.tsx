import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  List,
  Alert,
  confirmAlert,
  Icon,
  useNavigation,
  Form,
  Color,
} from "@raycast/api";
import { Search } from "./search";
import { Jenkins, JenkinsAPI } from "./lib/api";
import {
  addJenkins,
  deleteJenkins,
  listJenkins,
  addFavoriteInstance,
  removeFavoriteInstance,
  isFavoriteInstance,
} from "./lib/storage";
import { useState, useCallback, useEffect } from "react";

interface JenkinsWithStats extends Jenkins {
  isOnline?: boolean;
  totalJobs?: number;
  buildingJobs?: number;
  failedJobs?: number;
  lastChecked?: Date;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [jenkinsList, setJenkinsList] = useState<JenkinsWithStats[]>([]);
  const [hasJenkins, setHasJenkins] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const fetchStats = async (jenkins: Jenkins): Promise<JenkinsWithStats> => {
    const jenkinsWithStats: JenkinsWithStats = { ...jenkins, lastChecked: new Date() };

    try {
      const jenkinsAPI = new JenkinsAPI(jenkins);
      const resp = await jenkinsAPI.inspect();

      jenkinsWithStats.isOnline = true;
      jenkinsWithStats.totalJobs = resp.jobs?.length || 0;
      jenkinsWithStats.buildingJobs = resp.jobs?.filter((job) => job.color?.includes("anime")).length || 0;
      jenkinsWithStats.failedJobs = resp.jobs?.filter((job) => job.color?.startsWith("red")).length || 0;
    } catch (err) {
      jenkinsWithStats.isOnline = false;
    }

    return jenkinsWithStats;
  };

  const search = useCallback(
    async function search(searchText: string) {
      setIsLoading(true);
      try {
        const jenkinsList = await listJenkins();
        setHasJenkins(jenkinsList.length > 0);
        const results = jenkinsList.filter((j) => j.name.toLowerCase().includes(searchText.toLowerCase()));

        const jenkinsWithStats = await Promise.all(results.map(fetchStats));
        setJenkinsList(jenkinsWithStats);

        const favs = new Set<string>();
        for (const jenkins of jenkinsWithStats) {
          if (await isFavoriteInstance(jenkins.id)) {
            favs.add(jenkins.id);
          }
        }
        setFavorites(favs);
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Search Failed", message: String(err) });
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setJenkinsList],
  );

  useEffect(() => {
    search("");
  }, []);

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search Instances..." throttle>
      <List.EmptyView
        title={hasJenkins ? "No Results" : "No Instances Added"}
        description={hasJenkins ? "Try a different search." : "Add an instance to get started."}
        icon="iconnv.png"
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Plus}
              title="Add Instance"
              target={<AddJenkins setJenkinsList={setJenkinsList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
      {(() => {
        const favoriteInstances = jenkinsList.filter((j) => favorites.has(j.id));
        const otherInstances = jenkinsList.filter((j) => !favorites.has(j.id));

        return (
          <>
            {favoriteInstances.length > 0 && (
              <List.Section title="Favorites" subtitle={favoriteInstances.length + ""}>
                {favoriteInstances.map((jenkins) => (
                  <JenkinsItem
                    key={jenkins.id}
                    jenkins={jenkins}
                    setJenkinsList={setJenkinsList}
                    onRefresh={() => search("")}
                    isFavorite={true}
                    onToggleFavorite={async () => {
                      await removeFavoriteInstance(jenkins.id);
                      setFavorites((prev) => {
                        const next = new Set(prev);
                        next.delete(jenkins.id);
                        return next;
                      });
                    }}
                  />
                ))}
              </List.Section>
            )}
            {otherInstances.length > 0 && (
              <List.Section title="Results" subtitle={otherInstances.length + ""}>
                {otherInstances.map((jenkins) => (
                  <JenkinsItem
                    key={jenkins.id}
                    jenkins={jenkins}
                    setJenkinsList={setJenkinsList}
                    onRefresh={() => search("")}
                    isFavorite={false}
                    onToggleFavorite={async () => {
                      await addFavoriteInstance(jenkins.id);
                      setFavorites((prev) => {
                        const next = new Set(prev);
                        next.add(jenkins.id);
                        return next;
                      });
                    }}
                  />
                ))}
              </List.Section>
            )}
          </>
        );
      })()}
    </List>
  );
}

function JenkinsItem(props: {
  jenkins: JenkinsWithStats;
  setJenkinsList: (f: (v: Jenkins[]) => Jenkins[]) => void;
  onRefresh: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => Promise<void>;
}) {
  const getDisplayUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.replace(/^https?:\/\//, "").split("/")[0];
    }
  };

  const getStatusIcon = () => {
    if (props.jenkins.isOnline === undefined) {
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
    }
    return props.jenkins.isOnline
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : { source: Icon.XMarkCircle, tintColor: Color.Red };
  };

  const accessories: List.Item.Accessory[] = [];

  if (props.jenkins.isOnline !== undefined) {
    const statusTag = props.jenkins.isOnline
      ? { tag: { value: "Online", color: Color.Green } }
      : { tag: { value: "Offline", color: Color.Red } };
    accessories.push(statusTag);
  }

  if (props.jenkins.buildingJobs && props.jenkins.buildingJobs > 0) {
    accessories.push({
      tag: { value: `${props.jenkins.buildingJobs} Building`, color: Color.Blue },
      icon: Icon.CircleProgress,
    });
  }

  if (props.jenkins.failedJobs && props.jenkins.failedJobs > 0) {
    accessories.push({
      tag: { value: `${props.jenkins.failedJobs} Failed`, color: Color.Red },
      icon: Icon.XMarkCircle,
    });
  }

  if (props.jenkins.totalJobs !== undefined) {
    accessories.push({ text: `${props.jenkins.totalJobs} jobs` });
  }

  if (props.isFavorite) {
    accessories.push({ icon: Icon.Star, tooltip: "Favorite" });
  }

  return (
    <List.Item
      title={props.jenkins.name}
      subtitle={getDisplayUrl(props.jenkins.url)}
      icon={getStatusIcon()}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              icon={Icon.BarCode}
              title="View Jobs"
              target={<Search jenkins={props.jenkins} navigationTitle="Jobs" />}
            />
            <Action.OpenInBrowser title="Open in Browser" url={props.jenkins.url} />
            <Action.Push
              icon={Icon.Filter}
              title="Global Search"
              target={<Search jenkins={props.jenkins} navigationTitle="Global Search" isGlobalSearch={true} />}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
            />
            <Action
              icon={Icon.ArrowClockwise}
              title="Refresh Status"
              onAction={props.onRefresh}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              icon={props.isFavorite ? Icon.StarDisabled : Icon.Star}
              title={props.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              onAction={props.onToggleFavorite}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action.Push
              icon={Icon.Plus}
              title="Add Instance"
              target={<AddJenkins setJenkinsList={props.setJenkinsList} />}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action.Push
              icon={Icon.Patch}
              title="Update Instance"
              target={<AddJenkins jenkins={props.jenkins} setJenkinsList={props.setJenkinsList} />}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
            <Action.SubmitForm
              icon={Icon.Warning}
              title="Delete Instance"
              onSubmit={async () => {
                const options: Alert.Options = {
                  title: "Delete this Instance?",
                  message: "You will not be able to recover it",
                  primaryAction: {
                    title: "Delete Instance",
                    style: Alert.ActionStyle.Destructive,
                    onAction: async () => {
                      try {
                        await deleteJenkins(props.jenkins.id);
                        props.setJenkinsList((jenkinsList) => jenkinsList.filter((j) => j.id !== props.jenkins.id));
                      } catch (err) {
                        showToast(Toast.Style.Failure, "Delete failed", String(err));
                      }
                    },
                  },
                };
                await confirmAlert(options);
              }}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={props.jenkins.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddJenkins(props: { jenkins?: Jenkins; setJenkinsList: (f: (v: Jenkins[]) => Jenkins[]) => void }) {
  const { pop } = useNavigation();
  const action = props.jenkins ? "Update" : "Add";

  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }
  function dropUrlErrorIfNeeded() {
    if (urlError && urlError.length > 0) {
      setUrlError(undefined);
    }
  }

  return (
    <Form
      navigationTitle={action + " Instance"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.PlusCircle}
            title="Confirm"
            onSubmit={async (input: Jenkins) => {
              try {
                const j = {
                  ...props.jenkins,
                  ...input,
                };
                const jenkinsAPI = new JenkinsAPI(j);
                await jenkinsAPI.inspect();
                await addJenkins(jenkinsAPI.jenkins);

                props.setJenkinsList((jenkinsList) => {
                  if (!props.jenkins?.id) {
                    return [...jenkinsList, jenkinsAPI.jenkins];
                  }
                  return jenkinsList.map((jenkins) => {
                    if (jenkins.id === props.jenkins?.id) {
                      return {
                        ...jenkins,
                        ...input,
                      };
                    }
                    return jenkins;
                  });
                });
                pop();
              } catch (err) {
                showToast(Toast.Style.Failure, `${action} Instance Failed`, String(err));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        id="name"
        defaultValue={props.jenkins?.name}
        placeholder="Enter name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="URL"
        id="url"
        defaultValue={props.jenkins?.url}
        placeholder="Enter url"
        error={urlError}
        onChange={dropUrlErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setUrlError("The field should't be empty!");
          } else {
            dropUrlErrorIfNeeded();
          }
        }}
      />
      <Form.TextField
        title="Username"
        id="username"
        defaultValue={props.jenkins?.username}
        placeholder="Enter username"
      />
      <Form.PasswordField title="Token" id="token" defaultValue={props.jenkins?.token} placeholder="Enter token" />
      <Form.Checkbox
        title="Unsafe HTTPS"
        id="unsafeHttps"
        defaultValue={props.jenkins?.unsafeHttps}
        label="[DANGEROUS] Allow unsafe HTTPS requests"
      />
    </Form>
  );
}
