import { popToRoot, showToast, Toast } from "@raycast/api";
import FormAlias from "./components/form-alias";
import useApi from "./hooks/use-api";
import { AliasConflictError } from "./api/shell/errors/alias-conflict";
import { showFailureToast, usePromise } from "@raycast/utils";

interface CreateAliasFormValues {
  name: string;
  command: string;
}

export default function Command() {
  const { api, renderIfShellSupported } = useApi();

  const { isLoading } = usePromise(async () => {
    await api.shell().configure();
  });

  const handleSubmit = async (values: CreateAliasFormValues) => {
    try {
      await api.shell().createAlias(values);
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.name} alias created`,
      });
      popToRoot();
    } catch (error) {
      if (error instanceof AliasConflictError) {
        showToast({
          style: Toast.Style.Failure,
          title: "Oops!",
          message: "An alias with this name already exists",
        });
        return;
      }

      showFailureToast(error, { title: "Oops!", message: "Something went wrong" });
    }
  };

  return renderIfShellSupported(<FormAlias isLoading={isLoading} onSubmit={handleSubmit} />);
}
