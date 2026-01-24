export interface ProtonBackupFormData {
  filePath: string;
  password: string;
}

export interface ProtonBackupFormProps {
  localStorageSetter: (value: ProtonBackupFormData) => Promise<void>;
}

export interface PasswordsListProps {
  credentials: PasswordMetadata[];
}

export interface PasswordMetadata {
  metadata: {
    name: string;
    note: string;
    itemUuid: string;
  };
  extraFields: string[];
  type: string;
  content: {
    itemEmail: string;
    password: string;
    urls: string[];
    totpUri: string;
    passkeys: string[];
    itemUsername: string;
  };
}
