import {first} from "lodash"
import colors from "tailwindcss/colors"

export const colorForTailwind = (className: string | undefined) => {
  if (!className) {
    return colors.blue["500"]
  }

  const names = className.split(" ")

  const darkClass = first(names.filter((name) => name.startsWith("dark:")))
  const lightClass = first(names.filter((name) => !name.startsWith("dark:")))

  const dark = colorFromClassName(darkClass)
  const light = colorFromClassName(lightClass)

  return {dark, light}
}

const colorFromClassName = (name: string | undefined) => {
  if (!name) return

  name = name.replace("dark:", "")
  name = name.replace("text-", "")
  name = name.replace("fill-", "")

  const [color, value] = name.split("-")

  if (!color || !value) return

  const tailwindColors = colors as any

  const group = tailwindColors[color]

  return group?.[value]
}
