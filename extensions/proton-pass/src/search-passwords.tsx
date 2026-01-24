import { useLocalStorage, usePromise } from "@raycast/utils";
import { ProtonBackupFormData, PasswordMetadata } from "./api/proton-pass";
import { ProtonBackupForm } from "./components/credentials-prompt";
import { AvailablePasswords } from "./components/passwords-list";
import { getPasswordMetadata } from "./helpers/helper";

export default function Component() {
  const { value, setValue } = useLocalStorage<ProtonBackupFormData>("userdata");
  const { data } = usePromise<(value: ProtonBackupFormData | undefined) => Promise<PasswordMetadata[] | undefined>>(
    getPasswordMetadata,
    [value],
    {
      execute: value != undefined,
    },
  );

  if (value == undefined) {
    return <ProtonBackupForm localStorageSetter={setValue} />;
  }

  return <AvailablePasswords credentials={data ? data : []} />;
}
