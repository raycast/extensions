export type StorageType = "file" | "hardware";

export interface SSHKey {
    name: string;
    privateKeyPath: string;
    publicKeyPath: string;
    publicKeyContent: string;
    algorithm: string;
    fingerprint: string;
    comment: string;
    storageType: StorageType;
    hasPassphrase: boolean;
    createdAt: Date;
}
