// todo: add other color types
function generatePastelColor() {
  const R = Math.floor(Math.random() * 127 + 127)
  const G = Math.floor(Math.random() * 127 + 127)
  const B = Math.floor(Math.random() * 127 + 127)

  const rgb = (R << 16) + (G << 8) + B
  return `#${rgb.toString(16)}`
}

export const randomColor = () => {
  return generatePastelColor()
}

export const randomColors = () => {
  const colors = []
  for (let i = 0; i < 10; i++) {
    colors.push(generatePastelColor())
  }
  return colors
}
