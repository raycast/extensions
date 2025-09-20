/* eslint-disable @raycast/prefer-title-case */
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedState, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  ApiKey,
  CreateKeyForm,
  CreateKeyRequest,
  ErrorResponse,
  GetApiInfoResponse,
  RateLimitObjectType,
  UpdateKeyForm,
  UpdateKeyRequest,
} from "./utils/types";
import { createKey, getApiInfo, getApiKeys, revokeKey, updateKey } from "./utils/api";
import { APP_URL, RATELIMIT_TYPES } from "./utils/constants";
import ErrorComponent from "./components/ErrorComponent";

export default function Apis() {
  const { push } = useNavigation();

  const [apiInfos, setApiInfos] = useCachedState<GetApiInfoResponse[]>("apiInfos", []);
  const [isLoading, setIsLoading] = useState(false);

  async function confirmAndRemove(api: GetApiInfoResponse, apiIndex: number) {
    if (
      await confirmAlert({
        title: `Remove '${api.name}'?`,
        message: `This will NOT remove the API from your Unkey Dashboard.`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const newApiInfos = apiInfos;
      newApiInfos.splice(apiIndex, 1);
      setApiInfos([...newApiInfos]);
      setIsLoading(false);
    }
  }

  async function addOrUpdate(info: GetApiInfoResponse) {
    const index = apiInfos.findIndex((item) => item.id === info.id);
    if (index !== -1) {
      const newApiInfos = apiInfos;
      newApiInfos[index] = info;
      setApiInfos([...newApiInfos]);
      await showToast({
        title: "SUCCESS",
        message: `Updated existing API Info successfully`,
      });
    } else {
      setApiInfos([info, ...apiInfos]);
      await showToast({
        title: "SUCCESS",
        message: `${info.name} added successfully`,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add API"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            icon={Icon.Plus}
            target={<AddApi onApiAdded={(info) => addOrUpdate(info)} />}
          />
        </ActionPanel>
      }
    >
      {apiInfos.map((api, apiIndex) => (
        <List.Item
          key={api.id}
          title={api.name}
          subtitle={api.id}
          icon={Icon.Box}
          accessories={[{ tag: api.workspaceId }]}
          actions={
            <ActionPanel>
              <Action title="List Keys" onAction={() => push(<Keys apiInfo={api} />)} icon={Icon.Key} />
              <Action
                title="Remove API"
                onAction={() => confirmAndRemove(api, apiIndex)}
                style={Action.Style.Destructive}
                icon={Icon.Trash}
              />
              <Action.CopyToClipboard
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                title="Copy API ID To Clipboard"
                content={api.id}
              />
              <Action.OpenInBrowser shortcut={{ modifiers: ["cmd"], key: "o" }} url={APP_URL + api.id} />
              <ActionPanel.Section>
                <Action.Push
                  title="Add API"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  icon={Icon.Plus}
                  target={<AddApi onApiAdded={(info) => addOrUpdate(info)} />}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type AddApiProps = {
  onApiAdded: (info: GetApiInfoResponse) => void;
};
function AddApi({ onApiAdded }: AddApiProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  type FormValues = {
    id: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);
      const response = await getApiInfo(values.id);
      if ("error" in response) {
        showToast({
          title: "Invalid API ID",
          message: "Please enter a valid API ID",
          style: Toast.Style.Failure,
        });
      } else {
        onApiAdded(response);
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      id: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add API"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField title="API ID" placeholder="api_xxx" {...itemProps.id} />
    </Form>
  );
}

type KeysProps = {
  apiInfo: GetApiInfoResponse;
};
function Keys({ apiInfo }: KeysProps) {
  const { push } = useNavigation();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiId = apiInfo.id;

  async function getFromApi() {
    setIsLoading(true);
    const response = await getApiKeys(apiId, { limit: "100", offset: "0" });

    if (!("error" in response)) {
      setKeys(response.keys);
      showToast({
        title: "SUCCESS",
        message: `Fetched ${response.keys.length} of ${response.total} keys`,
      });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  async function confirmAndDelete(apiKey: ApiKey) {
    if (
      await confirmAlert({
        title: `Revoke '${apiKey.start}'?`,
        message: `This action can not be undone. Your users will no longer be able to authenticate using this key.`,
        primaryAction: { title: "Revoke", style: Alert.ActionStyle.Destructive },
      })
    ) {
      setIsLoading(true);
      const response = await revokeKey(apiKey.id);
      if (!("code" in response)) {
        await showToast({
          title: "Revoked Key",
          message: apiKey.start,
        });
      }
      await getFromApi();
    }
  }

  function getKeyColor(key: ApiKey) {
    if (key.expires)
      if (new Date() > new Date(key.expires)) return Color.Red;
      else if (key.remaining && key.remaining == 0) return Color.Red;

    return Color.Green;
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Keys"
      actions={
        <ActionPanel>
          <Action
            title="Create New Key"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<CreateKey apiInfo={apiInfo} onKeyCreated={getFromApi} />)}
          />
        </ActionPanel>
      }
    >
      <List.Section title={`API: ${apiInfo.name}`}>
        {!isLoading &&
          keys.map((key) => (
            <List.Item
              icon={{ source: Icon.Key, tintColor: getKeyColor(key) }}
              key={key.id}
              title={key.start}
              accessories={[{ tag: new Date(key.createdAt) }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy ID to Clipboard" content={key.id} />
                  {!isLoading && (
                    <Action
                      title="Update Key"
                      icon={Icon.Pencil}
                      onAction={() => push(<UpdateKey apiKey={key} onKeyUpdated={getFromApi} />)}
                    />
                  )}
                  {!isLoading && (
                    <Action
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      title="Delete Key"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => confirmAndDelete(key)}
                    />
                  )}
                  <Action.OpenInBrowser
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    url={`${APP_URL}${key.apiId}/keys/${key.id}`}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Create New Key"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() => push(<CreateKey apiInfo={apiInfo} onKeyCreated={getFromApi} />)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="ID" text={key.id} />
                      <List.Item.Detail.Metadata.Label title="API ID" text={key.apiId} />
                      <List.Item.Detail.Metadata.Label title="Workspace ID" text={key.workspaceId} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Start" text={key.start} />
                      <List.Item.Detail.Metadata.Label
                        title="Owner ID"
                        text={key.ownerId ? key.ownerId : undefined}
                        icon={key.ownerId ? undefined : Icon.Minus}
                      />
                      {/* <List.Item.Detail.Metadata.Label title="Owner ID" text={key.ownerId ? key.ownerId : undefined} icon={key.ownerId ? undefined : Icon.Minus} /> */}
                      <List.Item.Detail.Metadata.Label
                        title="Created At"
                        text={key.createdAt ? new Date(key.createdAt).toISOString() : undefined}
                        icon={key.createdAt ? undefined : Icon.Minus}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Expires"
                        text={key.expires ? new Date(key.expires).toISOString() : undefined}
                        icon={key.expires ? undefined : Icon.Minus}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Remaining"
                        text={key.remaining ? key.remaining.toString() : undefined}
                        icon={key.remaining || key?.remaining === 0 ? undefined : Icon.Minus}
                      />

                      {!key.meta ? (
                        <List.Item.Detail.Metadata.Label title="Meta" icon={Icon.Minus} />
                      ) : (
                        <List.Item.Detail.Metadata.TagList title="Meta">
                          {Object.entries(key.meta).map(([key, val]) => (
                            <List.Item.Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      )}

                      {key.ratelimit ? (
                        <List.Item.Detail.Metadata.TagList title="Rate Limit">
                          {Object.entries(key.ratelimit).map(([key, val]) => (
                            <List.Item.Detail.Metadata.TagList.Item key={key} text={`${key}: ${val}`} />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      ) : (
                        <List.Item.Detail.Metadata.Label title="Rate Limit" icon={Icon.Minus} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

type CreateKeyProps = {
  apiInfo: GetApiInfoResponse;
  onKeyCreated: () => void;
};
function CreateKey({ apiInfo, onKeyCreated }: CreateKeyProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const [enableRatelimiting, setEnableRatelimiting] = useState(false);

  const { handleSubmit, itemProps } = useForm<CreateKeyForm>({
    async onSubmit(values) {
      setIsLoading(true);
      const req: CreateKeyRequest = { apiId: apiInfo.id };

      if (values.remaining) req.remaining = Number(values.remaining);
      if (values.byteLength) req.byteLength = Number(values.byteLength);
      if (values.prefix) req.prefix = values.prefix;
      if (values.ownerId) req.ownerId = values.ownerId;
      if (values.expires) req.expires = values.expires.valueOf();
      if (values.meta) req.meta = JSON.parse(values.meta);
      if (enableRatelimiting) {
        req.ratelimit = {
          type: values.ratelimitType as RateLimitObjectType,
          limit: Number(values.ratelimitLimit),
          refillRate: Number(values.ratelimitRefillRate),
          refillInterval: Number(values.ratelimitRefillInterval),
        };
      }

      const response = await createKey(req);
      if (!("error" in response)) {
        showToast(Toast.Style.Success, "Created API Key", response.key);
        if (
          await confirmAlert({
            title: "Copy KEY?",
            message: "YOU WILL NOT BE ABLE TO SEE THE KEY AGAIN.",
            primaryAction: { title: "Copy" },
          })
        ) {
          await Clipboard.copy(response.key);
        }
        onKeyCreated();
        pop();
      }
      setIsLoading(false);
    },
    validation: {
      byteLength(value) {
        if (value)
          if (!Number(value)) return "The item must be a number";
          else if (Number(value) <= 0) return "The item must be greater than zero";
      },
      remaining(value) {
        if (value)
          if (!Number(value)) return "The item must be a number";
          else if (Number(value) <= 0) return "The item must be greater than zero";
      },
      meta(value) {
        if (value) {
          try {
            JSON.parse(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            return "The item must be valid JSON";
          }
        }
      },
      ratelimitLimit(value) {
        if (enableRatelimiting)
          if (value) {
            if (!Number(value)) return "The item must be a number";
            else if (Number(value) <= 0) return "The item must be greater than zero";
          } else return "The item is required";
      },
      ratelimitRefillRate(value) {
        if (enableRatelimiting)
          if (value) {
            if (!Number(value)) return "The item must be a number";
            else if (Number(value) <= 0) return "The item must be greater than zero";
          } else return "The item is required";
      },
      ratelimitRefillInterval(value) {
        if (enableRatelimiting)
          if (value) {
            if (!Number(value)) return "The item must be a number";
            else if (Number(value) <= 0) return "The item must be greater than zero";
          } else return "The item is required";
      },
    },
    initialValues: {
      byteLength: "16",
      ratelimitLimit: "10",
      ratelimitRefillRate: "1",
      ratelimitRefillInterval: "1000",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="All fields are optional" />
      <Form.Description title="API" text={`${apiInfo.name} - ${apiInfo.id}`} />

      <Form.TextField
        title="Prefix"
        placeholder="sk_live"
        info="To make it easier for your users to understand which product an api key belongs to, you can prefix them."
        {...itemProps.prefix}
      />
      <Form.TextField
        title="Byte Length"
        placeholder="16"
        info="The bytelength used to generate your key determines its entropy as well as its length. Higher is better, but keys become longer and more annoying to handle."
        {...itemProps.byteLength}
      />
      <Form.TextField
        title="Owner ID"
        placeholder="chronark"
        info="This is the id of the user or workspace in your system, so you can identify users from an API key."
        {...itemProps.ownerId}
      />
      <Form.DatePicker
        title="Expiry Date"
        type={Form.DatePicker.Type.Date}
        info="This api key will automatically be revoked after the given date."
        {...itemProps.expires}
      />
      <Form.TextField
        title="Remaining"
        placeholder="20"
        info="Optionally limit the number of times a key can be used. This is different from time-based expiration using expires."
        {...itemProps.remaining}
      />

      <Form.TextArea
        title="Custom Metadata"
        placeholder='{"stripeCustomerId" : "cus_9s6XKzkNRiz8i3"}'
        info="Enter custom metadata as a JSON object."
        {...itemProps.meta}
      />

      <Form.Separator />
      <Form.Checkbox
        id="enable_ratelimiting"
        label="Enable Ratelimiting"
        value={enableRatelimiting}
        onChange={setEnableRatelimiting}
      />
      {enableRatelimiting && (
        <>
          <Form.Dropdown title="Type" {...itemProps.ratelimitType}>
            {RATELIMIT_TYPES.map((type) => (
              <Form.Dropdown.Item key={type} title={type} value={type} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            title="Limit"
            placeholder="10"
            info="The maximum number of requests possible during a burst."
            {...itemProps.ratelimitLimit}
          />
          <Form.TextField
            title="Refill Rate"
            placeholder="1"
            info="How many requests may be performed in a given interval"
            {...itemProps.ratelimitRefillRate}
          />
          <Form.TextField
            title="Refill Interval (milliseconds)"
            placeholder="1000"
            info="Determines the speed at which tokens are refilled."
            {...itemProps.ratelimitRefillInterval}
          />
        </>
      )}
    </Form>
  );
}

type UpdateKeyProps = {
  apiKey: ApiKey;
  onKeyUpdated: () => void;
};
function UpdateKey({ apiKey, onKeyUpdated }: UpdateKeyProps) {
  const { pop, push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [enableRatelimiting, setEnableRatelimiting] = useState("ratelimit" in apiKey);

  const { handleSubmit, itemProps } = useForm<UpdateKeyForm>({
    async onSubmit(values) {
      setIsLoading(true);

      const req: UpdateKeyRequest = {
        ownerId: values.ownerId || null,
        meta: values.meta ? JSON.parse(values.meta) : null,
        expires: values.expires ? values.expires.valueOf() : null,
        remaining: values.remaining ? Number(values.remaining) : null,
        ratelimit: !enableRatelimiting
          ? null
          : {
              type: values.ratelimitType as RateLimitObjectType,
              limit: Number(values.ratelimitLimit),
              refillRate: Number(values.ratelimitRefillRate),
              refillInterval: Number(values.ratelimitRefillInterval),
            },
      };

      const response = await updateKey(apiKey.id, req);
      if (!("code" in response)) {
        await showToast({
          title: "Updated Key",
          message: apiKey.id,
        });
        onKeyUpdated();
        pop();
      } else {
        const errorResponse = response as ErrorResponse;
        push(<ErrorComponent errorResponse={errorResponse} />);
      }
      setIsLoading(false);
    },
    validation: {
      remaining(value) {
        if (value)
          if (!Number(value)) return "The item must be a number";
          else if (Number(value) <= 0) return "The item must be greater than zero";
      },
      meta(value) {
        if (value) {
          try {
            JSON.parse(value);
          } catch {
            return "The item must be valid JSON";
          }
        }
      },
      ratelimitLimit(value) {
        if (enableRatelimiting)
          if (value) {
            if (!Number(value)) return "The item must be a number";
            else if (Number(value) <= 0) return "The item must be greater than zero";
          } else return "The item is required";
      },
      ratelimitRefillRate(value) {
        if (enableRatelimiting)
          if (value) {
            if (!Number(value)) return "The item must be a number";
            else if (Number(value) <= 0) return "The item must be greater than zero";
          } else return "The item is required";
      },
      ratelimitRefillInterval(value) {
        if (enableRatelimiting)
          if (value) {
            if (!Number(value)) return "The item must be a number";
            else if (Number(value) <= 0) return "The item must be greater than zero";
          } else return "The item is required";
      },
    },
    initialValues: {
      ownerId: apiKey.ownerId,
      meta: JSON.stringify(apiKey.meta),
      expires: apiKey.expires ? new Date(apiKey.expires) : null,
      remaining: apiKey.remaining?.toString() || "",
      ratelimitType: apiKey.ratelimit?.type,
      ratelimitLimit: apiKey.ratelimit?.limit.toString() || "",
      ratelimitRefillRate: apiKey.ratelimit?.refillRate.toString() || "",
      ratelimitRefillInterval: apiKey.ratelimit?.refillInterval.toString() || "",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Update Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Owner ID"
        placeholder="chronark"
        info="This is the id of the user or workspace in your system, so you can identify users from an API key."
        {...itemProps.ownerId}
      />
      <Form.TextArea
        title="Custom Metadata"
        placeholder='{"stripeCustomerId" : "cus_9s6XKzkNRiz8i3"}'
        info="Enter custom metadata as a JSON object."
        {...itemProps.meta}
      />
      <Form.DatePicker
        title="Expiry Date"
        type={Form.DatePicker.Type.Date}
        info="This api key will automatically be revoked after the given date."
        {...itemProps.expires}
      />
      <Form.TextField
        title="Remaining"
        placeholder="20"
        info="Optionally limit the number of times a key can be used. This is different from time-based expiration using expires."
        {...itemProps.remaining}
      />

      <Form.Separator />
      <Form.Checkbox
        id="enable_ratelimiting"
        label="Enable Ratelimiting"
        value={enableRatelimiting}
        onChange={setEnableRatelimiting}
      />
      {enableRatelimiting && (
        <>
          <Form.Dropdown title="Type" {...itemProps.ratelimitType}>
            {RATELIMIT_TYPES.map((type) => (
              <Form.Dropdown.Item key={type} title={type} value={type} />
            ))}
          </Form.Dropdown>
          <Form.TextField
            title="Limit"
            placeholder="10"
            info="The maximum number of requests possible during a burst."
            {...itemProps.ratelimitLimit}
          />
          <Form.TextField
            title="Refill Rate"
            placeholder="1"
            info="How many requests may be performed in a given interval"
            {...itemProps.ratelimitRefillRate}
          />
          <Form.TextField
            title="Refill Interval (milliseconds)"
            placeholder="1000"
            info="Determines the speed at which tokens are refilled."
            {...itemProps.ratelimitRefillInterval}
          />
        </>
      )}
    </Form>
  );
}
