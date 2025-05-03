import { useForm } from "@raycast/utils";
import { showToast } from "@raycast/api";
import { Values, TunnelType, ListData } from "../types";

enum Message {
  Required = "The item is required",
  InvalidHost = "Invalid hostname",
}

export const initForm = (listData: ListData[], onSubmit: (values: Values) => void) => {
  const portValidation = (value: string | undefined, required = true) => {
    if (!required && !value) return;
    const num = Number(value);
    if (!num && num !== 0) return "Should be number";
    else if (num < 1 || num > 65535) return "Should be a number between 1-65535";
    else if (!value && required) {
      return Message.Required;
    }
  };

  const hostRegex =
    /((^\s*((([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]))\s*$)|(^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$))|((^([a-zA-Z][a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)+(\.([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*))*$))/;

  const { handleSubmit, itemProps, values, setValue } = useForm<Values>({
    onSubmit: (values) => {
      onSubmit(values);
      showToast({ title: "Tunnel Created", message: "Tunnel Successfully created" });
    },
    validation: {
      name: (value) => {
        if (listData.find((i) => i.name === value)) return "The tunnel had been created";
        else if (!value) {
          return Message.Required;
        }
      },
      sshPort: (value) => portValidation(value, false),
      sshHost: (value) => {
        if (!value) return Message.Required;
        else if (!value.match(hostRegex)) return Message.InvalidHost;
      },
      user: (value) => {
        if (!value) return Message.Required;
        else if (!value.match(/^[a-z_][a-z0-9_.-]*$/)) return "Invalid username";
      },
      remoteHost: (value) => {
        if (value && !value.match(hostRegex)) return Message.InvalidHost;
      },
      localPort: (value) => {
        if (listData.find((i) => i.localPort === value)) return "This port had been used";
        return portValidation(value);
      },
      remotePort: portValidation,
    },
    initialValues: {
      name: "",
      localPort: "",
      user: "",
      sshPort: "",
      remoteHost: "",
      remotePort: "",
      proxy: false,
      type: TunnelType.Local,
    },
  });

  return {
    handleSubmit,
    itemProps,
    values,
  };
};
