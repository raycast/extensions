import { type ComponentType } from 'react'
import { Clipboard } from '@raycast/api'
import '@groqfmt/wasm/dist/wasm-exec.js'
import { suspend } from 'suspend-react'
import FormatGroq from './components/format-groq'

const Command: ComponentType = () => {
  const input = suspend(async () => await Clipboard.readText(), ['clipboard'])
  return <FormatGroq defaultInput={input ?? ''} />
}

export default Command
