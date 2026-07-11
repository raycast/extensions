import { type ComponentType } from 'react'
import { type LaunchProps } from '@raycast/api'
import '@groqfmt/wasm/dist/wasm-exec.js'
import FormatGroq from './components/format-groq'

type Props = LaunchProps<{
  arguments: {
    input: string
  }
}>

const Command: ComponentType<Props> = props => {
  return <FormatGroq defaultInput={props.arguments.input} />
}

export default Command
