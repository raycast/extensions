import type { Secret } from '@scaleway/sdk'
import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { SecretVersions as SecretV } from './SecretVersions'

type SecretVersionsProps = {
  secret: Secret.v1beta1.Secret
}

export const SecretVersions = ({ secret }: SecretVersionsProps) => (
  <DataLoaderProvider>
    <SecretV secret={secret} />
  </DataLoaderProvider>
)
