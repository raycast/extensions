import {
  Form,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";

import QueryPanel from "@src/query";
import { createPool } from "@src/db";
import { IConfigDB, ISyncData } from "@src/interface";
import {
  checkDatabaseExists,
  createConfig,
  generateUUID,
  updateConfig,
} from "./util";
import {
  DATABASE_TYPE,
  DEVELOP_ENV,
  ENV_LIST,
  LOCAL_STORAGE_TYPE,
} from "@src/constants";
import { FormValidation, useForm } from "@raycast/utils";
import useCachedData from "./hooks/useCachedData";

export default function ConnectDatabase(props: { draftValues?: IConfigDB }) {
  const { draftValues } = props;
  const { push, pop } = useNavigation();
  const { enableDrafts, storeValue } = getPreferenceValues();
  const [data, setData] = useCachedData();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const testDatabaseConnection = async (configDB: any) => {
    const pool = createPool(configDB);

    try {
      const client = await pool.connect();
      await client.query("SELECT NOW()");

      showToast({
        style: Toast.Style.Success,
        title: "Connection successful!",
      });
      return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error connecting to the database:", error);
      showToast({
        style: Toast.Style.Failure,
        title: `Error connecting to the database: ${error.message}`,
      });
      return;
    } finally {
      await pool.end();
    }
  };

  const handleTestConnectionDataBase = (values: IConfigDB) => {
    testDatabaseConnection(values);
  };

  const saveConnectionConfig = async (values: IConfigDB) => {
    if (draftValues?.id) {
      const foundIndex = data?.dbConfigs.findIndex((config) => config.id === draftValues?.id);
      const updatedConfig = { ...values, id: draftValues?.id }

      setData((prevState?: ISyncData) => {
        if (foundIndex != undefined && foundIndex != -1 && prevState?.dbConfigs?.length) {
          const updatedDbConfigs = [...(prevState?.dbConfigs || [])];
          updatedDbConfigs[foundIndex] = updatedConfig;
          return {
            ...prevState,
            dbConfigs: updatedDbConfigs,
          };
        }

        return prevState
      });

      await updateConfig(
        draftValues?.id,
        updatedConfig,
        LOCAL_STORAGE_TYPE.CONFIG_DATA
      );
    }
  };

  const handleSaveConnectionAndGoQuery = async (value: IConfigDB) => {
    const isExistConfig = await checkDatabaseExists(
      value,
      LOCAL_STORAGE_TYPE.CONFIG_DATA
    );
    if (isExistConfig) {
      showToast({
        style: Toast.Style.Failure,
        title: `Database config is exist!`,
      });
      return;
    }

    const databaseConfig = {
      ...value,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    await createConfig(databaseConfig, LOCAL_STORAGE_TYPE.CONFIG_DATA);
    push(<QueryPanel config={value} />);
    return true;
  };

  const { itemProps, handleSubmit } = useForm<IConfigDB>({
    initialValues: {
      ...draftValues,
      env: draftValues?.env || DEVELOP_ENV.LOCAL,
      isDefault:
        draftValues?.isDefault != undefined ? draftValues?.isDefault : true,
    },
    validation: {
      database: FormValidation.Required,
      password: FormValidation.Required,
      host: FormValidation.Required,
      port: FormValidation.Required,
    },
    async onSubmit(values) {
      if (draftValues) {
        await saveConnectionConfig(values);
        await showToast({
          style: Toast.Style.Success,
          title: "Connection updated",
        });
        pop();
      } else {
        handleSaveConnectionAndGoQuery(values);
      }
    },
  });

  return (
    <Form
      enableDrafts={enableDrafts}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.draftValues ? "Edit Connection" : "Connect and Query"}
            onSubmit={handleSubmit}
            icon={Icon.CodeBlock}
          />
          <Action.SubmitForm
            title="Testing Connection"
            onSubmit={handleTestConnectionDataBase}
            icon={Icon.Plug}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        {...itemProps.databaseType}
        title="Select database"
        storeValue={!draftValues?.databaseType && storeValue}
      >
        {DATABASE_TYPE.map(item => (
          <Form.Dropdown.Item
            key={item.value}
            value={item.value}
            title={item.title}
            icon={{ source: item.icon }}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField
        {...itemProps.database}
        title="Database"
        placeholder="Enter database"
      />

      <Form.TextField
        {...itemProps.host}
        title="Host"
        placeholder="Enter host"
      />

      <Form.TextField
        {...itemProps.port}
        title="Port"
        placeholder="Enter port"
      />

      <Form.TextField

        {...itemProps.user}
        title="Username"
        placeholder="Enter username"
      />

      <Form.TextField
        {...itemProps.password}
        title="Password"
        placeholder="Enter password"
      />

      <Form.Dropdown {...itemProps.env} title="Environment">
        {ENV_LIST.map(({ color, label, value }) => (
          <Form.Dropdown.Item
            key={value}
            value={value}
            title={label}
            icon={{ source: Icon.Dot, tintColor: color }}
          />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        {...itemProps.isDefault}
        label="Make default connection quick query?"
      />

      <Form.TextArea
      
        {...itemProps?.note}
        title="Note"
        placeholder="Enter note"
      />
    </Form>
  );
}
