import { ActionPanel, Form, SubmitFormAction, useNavigation, showToast, ToastStyle } from "@raycast/api"
import { rgba, parseToHsl } from "polished"
import { Results } from "./components"

type Values = {
  hex: string
  alpha: string
}

export default function ConvertHex() {
  const { push } = useNavigation()

  function handleSubmit(values: Values): void {
    const { hex, alpha = "1" } = values
    const a = parseFloat(alpha)

    if (!hex) {
      showToast(ToastStyle.Failure, "HEX is required", "Please enter a value for HEX.")
      return
    }

    let rgbaResult
    try {
      rgbaResult = rgba(hex, a)
    } catch(error) {
      showToast(ToastStyle.Failure, "Couldn't parse the color string", "Please provide the color as a string in hex notation.")
      return
    }
    const { hue: h, saturation: s, lightness: l } = parseToHsl(hex)
    const hslaResult = `hsla(${parseFloat(h.toFixed(2))},${parseFloat(s.toFixed(2)) * 100}%,${parseFloat(l.toFixed(2)) * 100}%,${alpha})`

    push(<Results input={hex} rgba={rgbaResult} hsla={hslaResult} />)
  }

  return (
    <Form navigationTitle="Convert HEX to RGB & HSL" actions={
      <ActionPanel>
        <SubmitFormAction title="Convert" onSubmit={handleSubmit} />
      </ActionPanel>
    }>
      <Form.TextField id="hex" placeholder="#000" title="HEX" />
      <Form.TextField id="alpha" defaultValue="1" title="Alpha (0 to 1)" />
    </Form>
  )
}