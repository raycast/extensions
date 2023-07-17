import type { Secret } from '@scaleway/sdk'
import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from 'providers'
import { SecretVersions as SecretV } from './SecretVersions'

type SecretVersionsProps = {
  secret: Secret.v1alpha1.Secret
}

export const SecretVersions = ({ secret }: SecretVersionsProps) => (
  <DataLoaderProvider>
    <APIProvider>
      <SecretV secret={secret} />
    </APIProvider>
  </DataLoaderProvider>
)
