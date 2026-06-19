import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getAvatarIcon, getFavicon, useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { DNSRecord, Domain, DomainServiceInfo, Notification } from "./types";
import { callOvh, ovh } from "./ovh";

function generateNotificationAccessories(notification: Notification) {
  const accessories: List.Item.Accessory[] = [];
  switch (notification.priority) {
    case "LOW":
      accessories.push({tag: {value: notification.priority, color: Color.Blue}});
      break;
      case "MEDIUM":
        accessories.push({tag: {value: notification.priority, color: Color.Yellow}});
        break;
      case "HIGH":
      accessories.push({tag: {value: notification.priority, color: Color.Red}});
      break;
  }
  accessories.push({date: new Date(notification.createdAt)})
  accessories.push({text: notification.categories.join()})
  return accessories;
}

export default function MyMessages() {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-notification-details", false);
  const {
    isLoading,
    data: notifications,
    revalidate,
  } = useCachedPromise(
    async () => {
      const list = await callOvh<Notification[]>("v2/notification/history");
      const notifications = await Promise.all(list.map((notification) => callOvh<Notification & {text: string}>(`v2/notification/history/${notification.id}`)));
      return notifications;
    },
    [],
    {
      initialData: [],
    },
  );
  return (
      <List isLoading={isLoading} isShowingDetail={isShowingDetail}>
        {notifications.map((notification) => (
          <List.Item
            key={notification.id}
            title={notification.title}
            accessories={!isShowingDetail ? generateNotificationAccessories(notification) : undefined}
            detail={
              <List.Item.Detail
                markdown={notification.text}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Date" text={notification.createdAt} />
                    <List.Item.Detail.Metadata.TagList title="Priority">
                      <List.Item.Detail.Metadata.TagList.Item text={notification.priority} color={notification.priority==="LOW" ? Color.Blue : notification.priority==="MEDIUM" ? Color.Yellow : Color.Red} />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Categories" text={notification.categories.join(", ")} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                  icon={Icon.AppWindowSidebarLeft}
                  title="Toggle Details"
                  onAction={() => setIsShowingDetail((show) => !show)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
  
  function DNSRecords({ domain }: { domain: Domain }) {
    const {
      isLoading,
      data: records,
      mutate,
    } = useCachedPromise(
      async (domain: string) => {
        const list = await callOvh<string[]>(`v1/domain/zone/${domain}/record`);
        const records = await Promise.all(
          list.map((record) => callOvh<DNSRecord>(`v1/domain/zone/${domain}/record/${record}`)),
        );
        return records;
      },
      [domain.domain],
      {
        initialData: [],
      },
    );
  
    async function confirmAndDelete(record: DNSRecord) {
      const options: Alert.Options = {
        icon: { source: Icon.Trash, tintColor: Color.Red },
        title: `Are you sure you want to delete the ${record.fieldType} record from the DNS zone of the domain?`,
        message: `The deletion will be applied immediately on the DNS zone, but please note that the change may take up to 24 hours to propagate.`,
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: "Delete",
        },
      };
      if (!(await confirmAlert(options))) return;
  
      const toast = await showToast(Toast.Style.Animated, `Deleting ${record.fieldType}`, record.id.toString());
      try {
        await mutate(
          callOvh(`v1/domain/zone/${record.zone}/record/${record.id}`, {
            method: "DELETE",
          }),
          {
            optimisticUpdate(data) {
              return data.filter((d) => d.id !== record.id);
            },
            shouldRevalidateAfter: false,
          },
        );
        toast.title = "Deleted! Refreshing";
        await ovh.domain.zone.refresh(record.zone).catch(() => {
          throw new Error("Could not refresh");
        });
        toast.style = Toast.Style.Success;
        toast.title = "Refreshed";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    }
    return (
      <List isLoading={isLoading} isShowingDetail navigationTitle={`Manage Domains / ${domain.domain} / DNS Records`}>
        {records.map((record) => (
          <List.Item
            key={record.id}
            icon={getAvatarIcon(record.fieldType)}
            title={record.zone}
            accessories={[{ tag: record.fieldType }]}
            detail={<List.Item.Detail markdown={record.target} />}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Create DNS Record"
                  target={<CreateDNSRecord zoneName={record.zone} />}
                />
                <Action
                  icon={Icon.Trash}
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title="Delete DNS Record"
                  onAction={() => confirmAndDelete(record)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
  
  const types = {
    Pointer: ["A", "AAAA"],
    Extended: ["TXT"],
    Mail: ["MX"],
  };
  function CreateDNSRecord({ zoneName }: { zoneName: string }) {
    const { pop } = useNavigation();
    type FormValues = {
      fieldType: string;
      subDomain: string;
      priority: string;
      target: string;
    };
    const { handleSubmit, itemProps, values } = useForm<FormValues>({
      async onSubmit(values) {
        const toast = await showToast(Toast.Style.Animated, "Creating", values.fieldType);
        try {
          await callOvh(`v1/domain/zone/${zoneName}/record`, {
            method: "POST",
            body: {
              ...values,
              subDomain: values.subDomain || null,
            },
          });
          toast.title = "Created! Refreshing";
          await callOvh(`v1/domain/zone/${zoneName}/refresh`, {
            method: "POST",
          }).catch(() => {
            throw new Error("Could not refresh");
          });
          toast.style = Toast.Style.Success;
          toast.title = "Refreshed";
          pop();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed";
          toast.message = `${error}`;
        }
      },
      validation: {
        fieldType: FormValidation.Required,
        priority(value) {
          if (values.fieldType === "MX") {
            if (!value) return "The item is required";
            if (!Number(value)) return "The item must be a number";
            if (+value < 1 || +value > 65535) return "The item must be 1-65535";
          }
        },
        target: FormValidation.Required,
      },
    });
    return (
      <Form
        navigationTitle={`... / DNS Records / ${zoneName} / Create`}
        actions={
          <ActionPanel>
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.SubmitForm icon={Icon.Plus} title="Create DNS Record" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.Dropdown title="Type" {...itemProps.fieldType}>
          {Object.entries(types).map(([section, items]) => (
            <Form.Dropdown.Section key={section} title={section}>
              {items.map((item) => (
                <Form.Dropdown.Item key={item} title={item} value={item} />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
        <Form.TextField placeholder="Leave empty for @" title="Sub-domain" {...itemProps.subDomain} />
        <Form.Description text={`${values.subDomain || ""}.${zoneName}`} />
        {values.fieldType === "MX" && <Form.TextField title="Priority" placeholder="1-65535" {...itemProps.priority} />}
        <Form.TextField title="Value" {...itemProps.target} />
      </Form>
    );
  }
  
  function ModifyDNSServers({ domain }: { domain: Domain }) {
    const { pop } = useNavigation();
    type FormValues = {
      ns1: string;
      ns2: string;
      ns3: string;
      ns4: string;
    };
    const { handleSubmit, itemProps } = useForm<FormValues>({
      async onSubmit(values) {
        const toast = await showToast(Toast.Style.Animated, "Modifying");
        try {
          await callOvh(`v1/domain/${domain.domain}/nameServers/update`, {
            method: "POST",
            body: {
              nameServers: Object.values(values)
                .filter((host) => !!host)
                .map((host) => ({ host })),
            },
          });
          toast.style = Toast.Style.Success;
          toast.title = "Modified";
          pop();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed";
          toast.message = `${error}`;
        }
      },
      initialValues: {
        ns1: domain.nameServers[0]?.nameServer,
        ns2: domain.nameServers[1]?.nameServer,
        ns3: domain.nameServers[2]?.nameServer,
        ns4: domain.nameServers[3]?.nameServer,
      },
      validation: {
        ns1: FormValidation.Required,
        ns2: FormValidation.Required,
      },
    });
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.Network} title="Apply Configuration" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.TextField title="DNS server 1" placeholder={domain.nameServers[0]?.nameServer} {...itemProps.ns1} />
        <Form.TextField title="DNS server 2" placeholder={domain.nameServers[1]?.nameServer} {...itemProps.ns2} />
        <Form.TextField title="DNS server 3" placeholder={domain.nameServers[2]?.nameServer} {...itemProps.ns3} />
        <Form.TextField title="DNS server 4" placeholder={domain.nameServers[3]?.nameServer} {...itemProps.ns4} />
      </Form>
    );
  }
  
  function UpdateServiceInformation({ serviceName }: { serviceName: string }) {
    const { pop } = useNavigation();
    type FormValues = {
      period: string;
      alsoUpdateDNSZone: boolean;
    };
    const { isLoading: isLoadingPaymentMethods, data: paymentMethods } = useCachedPromise(async () => {
      const result = await callOvh<number[]>("v1/me/payment/method?status=VALID");
      return result;
    });
    const { isLoading, data } = useCachedPromise(
      async (serviceName: string) => {
        const result = await callOvh<DomainServiceInfo>(`v1/domain/${serviceName}/serviceInfos`);
        return result;
      },
      [serviceName],
    );
    const { handleSubmit, itemProps, values } = useForm<FormValues>({
      async onSubmit(values) {
        const toast = await showToast(Toast.Style.Animated, "Updating");
        const body = {
          renew: {
            manualPayment: !values.period,
            deleteAtExpiration: !!data?.renew?.deleteAtExpiration,
            forced: !!data?.renew?.forced,
            automatic: !!values.period,
            period: values.period ? +values.period : null,
          },
        };
        try {
          const updates = [
            callOvh(`v1/domain/${serviceName}/serviceInfos`, {
              method: "PUT",
              body,
            }),
          ];
          if (values.alsoUpdateDNSZone)
            updates.push(
              callOvh(`v1/domain/zone/${serviceName}/serviceInfos`, {
                method: "PUT",
                body,
              }).then(() =>
                ovh.domain.zone.refresh(serviceName).catch(() => {
                  throw new Error("Could not refresh");
                }),
              ),
            );
          await Promise.all(updates);
          toast.style = Toast.Style.Success;
          toast.title = "Updated";
          pop();
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed";
          toast.message = `${error}`;
        }
      },
      initialValues: {
        period: data?.renew?.period?.toString(),
      },
    });
    return (
      <Form
        isLoading={isLoadingPaymentMethods || isLoading}
        navigationTitle={`... / ${serviceName} / Update Service Information`}
        actions={
          <ActionPanel>
            <Action.SubmitForm icon={Icon.Pencil} title="Update Service Information" onSubmit={handleSubmit} />
          </ActionPanel>
        }
      >
        <Form.Description
          title="Configure renewal"
          text={`How often would you like to renew your ${serviceName} service?`}
        />
        <Form.Dropdown title="" {...itemProps.period}>
          <Form.Dropdown.Item title="Manual renewal" value="" />
          <Form.Dropdown.Item title="Every year" value="12" />
          <Form.Dropdown.Item title="Every 2 years" value="24" />
          <Form.Dropdown.Item title="Every 3 years" value="36" />
          <Form.Dropdown.Item title="Every 4 years" value="48" />
          <Form.Dropdown.Item title="Every 5 years" value="60" />
          <Form.Dropdown.Item title="Every 6 years" value="72" />
          <Form.Dropdown.Item title="Every 7 years" value="84" />
          <Form.Dropdown.Item title="Every 8 years" value="96" />
          <Form.Dropdown.Item title="Every 9 years" value="108" />
        </Form.Dropdown>
        {!values.period ? (
          <>
            <Form.Description
              text={`You have selected manual renewal for your ${serviceName} service. Your service won't automatically renew when it expires.`}
            />
          </>
        ) : (
          <>
            <Form.Description
              text={`This service will automatically renew every ${+values.period / 12} ${values.period === "12" ? "year" : "years"}.
          
  If you choose not to renew, disable auto-renewal before your service expires.`}
            />
            {!paymentMethods?.length && (
              <Form.Description
                text={`You have selected automatic payment for your ${serviceName} service. To use this renewal method, please enter a payment method in the “Payments Methods” section.`}
              />
            )}
          </>
        )}
        <Form.Checkbox label="Also Update DNS Zone" {...itemProps.alsoUpdateDNSZone} />
      </Form>
    );
  }
  