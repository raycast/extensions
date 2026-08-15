import type { Secretv1beta1 } from '@scaleway/sdk'
import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { SecretVersions as SecretV } from './SecretVersions'

type SecretVersionsProps = {
  secret: Secretv1beta1.Secret
}

export const SecretVersions = ({ secret }: SecretVersionsProps) => (
  <DataLoaderProvider>
    <SecretV secret={secret} />
  </DataLoaderProvider>
)
