import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { callVanguard, useVanguard, useVanguardPaginated } from "./vanguard";
import { BackupDestination, BackupTask, BackupTaskFrequency, BackupTaskType, CreateBackupTask, Server, User } from "./types";

export default function SearchBackupTasks() {
  const {isLoading, data:tasks, pagination, error, revalidate} = useVanguardPaginated<BackupTask>("backup-tasks");
  const isEmpty = !isLoading && !tasks.length && !error;
  return <List isLoading={isLoading} pagination={pagination} isShowingDetail={!isEmpty}>
    {isEmpty ? <List.EmptyView icon="backup-task.svg" title="You don't have any backup tasks!" description="You can configure your first backup task by clicking the button below." actions={<ActionPanel>
      <Action.Push icon={Icon.Plus} title="Add Backup Task" target={<AddBackupTask />} onPop={revalidate} />
    </ActionPanel>} /> : tasks.map(task => <List.Item key={task.id} icon="backup-task.svg" title={task.label} accessories={[
        task.status==="ready" ? {icon: {source: Icon.CheckCircle, tintColor: Color.Green}, tooltip: "Ready"} : {}
    ]} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Server ID" text={task.remote_server_id.toString()} />
      <List.Item.Detail.Metadata.Label title="Destination ID" text={task.backup_destination_id.toString()} />
      {/* <List.Item.Detail.Metadata.Label title="Scheduled" text={task.backup_destination_id.toString()} /> */}
    </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
      <Action.Push icon={Icon.Plus} title="Add Backup Task" target={<AddBackupTask />} onPop={revalidate} />  
    </ActionPanel>} />)}
  </List>
}

const BACKUP_TASK_TIMES = [
  "00:00", "00:15", "00:30", "00:45",
  "01:00", "01:15", "01:30", "01:45",
  "02:00", "02:15", "02:30", "02:45",
  "03:00", "03:15", "03:30", "03:45",
  "04:00", "04:15", "04:30", "04:45",
  "05:00", "05:15", "05:30", "05:45",
  "06:00", "06:15", "06:30", "06:45",
  "07:00", "07:15", "07:30", "07:45",
  "08:00", "08:15", "08:30", "08:45",
  "09:00", "09:15", "09:30", "09:45",
  "10:00", "10:15", "10:30", "10:45",
  "11:00", "11:15", "11:30", "11:45",
  "12:00", "12:15", "12:30", "12:45",
  "13:00", "13:15", "13:30", "13:45",
  "14:00", "14:15", "14:30", "14:45",
  "15:00", "15:15", "15:30", "15:45",
  "16:00", "16:15", "16:30", "16:45",
  "17:00", "17:15", "17:30", "17:45",
  "18:00", "18:15", "18:30", "18:45",
  "19:00", "19:15", "19:30", "19:45",
  "20:00", "20:15", "20:30", "20:45",
  "21:00", "21:15", "21:30", "21:45",
  "22:00", "22:15", "22:30", "22:45",
  "23:00", "23:15", "23:30", "23:45"
]


function AddBackupTask() {

  type FormValues = Omit<CreateBackupTask, "remote_server_id"|"type"|"backup_destination_id"|"maximum_backups_to_keep"|"frequency"> & {
    remote_server_id: string;
    type: string;
    backup_destination_id: string;
    maximum_backups_to_keep: string;
    frequency: string;
  };
  const {isLoading: isLoadingServers, data:servers} = useVanguardPaginated<Server>("remote-servers");
  const {isLoading: isLoadingDestinations, data:destinations} = useVanguardPaginated<BackupDestination>("backup-destinations");
  const {isLoading: isLoadingUser, data:user} = useVanguard<User>("user");

  const {pop} = useNavigation();
  const {handleSubmit, itemProps} = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.label);
      try {
        await callVanguard("backup-tasks", {
          method: "POST",
          body: values
        })
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      maximum_backups_to_keep: "5",
    },
    validation: {
      label: FormValidation.Required,
      remote_server_id: FormValidation.Required,
      backup_destination_id: FormValidation.Required,
      maximum_backups_to_keep(value) {
        if (!value) return "The item is required";
        if (value!=="0") {
          if (!Number(value)) return "The item must be a number";
          if (Number(value)<0) return "Must be at least 0";
        }
      },
      source_path: FormValidation.Required
    }
  })

  const isLoading = isLoadingServers || isLoadingDestinations || isLoadingUser;
  return <Form isLoading={isLoading} actions={<ActionPanel>
    <Action.SubmitForm icon="backup-task.svg" title="Save" onSubmit={handleSubmit} />
  </ActionPanel>}>
    <Form.Description text="Details" />
    <Form.TextField title="Label" {...itemProps.label} />
    <Form.TextArea title="Description" {...itemProps.description} />
    <Form.Separator />
    
    <Form.Description text="Configuration" />
    <Form.Dropdown title="Remote Server" info="Choose the remote server from which you want to create a backup. Remember, if you plan to perform database backups on any remote server, you must set a database password for it." {...itemProps.remote_server_id}>
      {servers.map(server => <Form.Dropdown.Item key={server.id} title={`${server.label} (${server.connection.ip_address})`} value={server.id.toString()} />)}
    </Form.Dropdown>
    <Form.Dropdown title="Backup Type" {...itemProps.type}>
      {Object.entries(BackupTaskType).map(([key,val]) => <Form.Dropdown.Item key={key} title={key} value={val} />)}
    </Form.Dropdown>
    <Form.Dropdown title="Backup Destination" info="Choose the backup destination where you want to store the backup files. If you have not yet set up a backup destination, you can do so in the Backup Destinations section." {...itemProps.backup_destination_id}>
      {destinations.map(destination => <Form.Dropdown.Item key={destination.id} title={`${destination.label} - ${destination.type_human}`} value={destination.id.toString()} />)}
    </Form.Dropdown>
    <Form.TextField title="Maximum Backups to Keep" info="Set the maximum limit for stored backups. Any backups exceeding this limit will be removed, starting with the oldest. Enter 0 to disable and store all backups." {...itemProps.maximum_backups_to_keep} />
    <Form.Separator />

    <Form.Description text="Backup Info" />
    <Form.TextField title="Path of Directory on Remote Server to Backup" placeholder="/path/to/backup" info="Please provide the UNIX path of the directory on your remote server that you would like to backup." {...itemProps.source_path} />
    {/* <Form.PasswordField title="Encryption Password" info="You can optionally set an encryption password which will enhance the security of this backup." {...itemProps} /> */}
    {/* <Form.TextField title="Additional Filename Text" info="You have the option to add extra characters to the filename. This can make it easier for you to identify the file later." {...itemProps.} /> */}
    <Form.TextField title="Backup Destination Directory" placeholder="/save/to/backup" info="This is the directory path where the backup will be stored. If the specified folders do not exist, they will be automatically created. If not specified, the backup files will be placed in the root directory of your backup destination." {...itemProps.store_path} />
    <Form.Separator />
    
    <Form.Description text="Backup Schedule" />
    <Form.Dropdown title="Backup Frequency" {...itemProps.frequency}>
      {Object.entries(BackupTaskFrequency).map(([key,val]) => <Form.Dropdown.Item key={key} title={key} value={val} />)}
    </Form.Dropdown>
    <Form.Dropdown info={`The time is based on your timezone: ${user?.account_settings.timezone ?? "?"}`} {...itemProps.time_to_run_at}>
      {BACKUP_TASK_TIMES.map(time => <Form.Dropdown.Item key={time} title={time} value={time} />)}
    </Form.Dropdown>
    <Form.Separator />
  </Form>
}