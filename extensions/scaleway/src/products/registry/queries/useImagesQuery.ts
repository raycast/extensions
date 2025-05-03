import type { Registry } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useImagesQuery = (
  params: Registry.v1.ListImagesRequest,
  dataloaderOptions: DataLoaderOptions<Registry.v1.ListImagesResponse> = {}
) => {
  const { registryV1 } = useAPI()

  const key = ['registry', 'images', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, () => registryV1.listImages(params), dataloaderOptions)
}

export const useAllImagesQuery = (
  params: Registry.v1.ListImagesRequest,
  dataloaderOptions: DataLoaderOptions<Registry.v1.ListImagesResponse['images']> = {}
) => {
  const { registryV1 } = useAPI()

  const key = ['registry', 'images', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, () => registryV1.listImages(params).all(), dataloaderOptions)
}
