import type { Function } from '@scaleway/sdk'
import { DataLoaderProvider } from '@scaleway/use-dataloader'
import { APIProvider } from '../../providers'
import { FunctionLogs as FunctionL } from './FunctionLogs'

type FunctionLogsProps = {
  serverlessFunction: Function.v1beta1.Function
}

export const FunctionLogs = ({ serverlessFunction }: FunctionLogsProps) => (
  <DataLoaderProvider>
    <APIProvider>
      <FunctionL serverlessFunction={serverlessFunction} />
    </APIProvider>
  </DataLoaderProvider>
)
