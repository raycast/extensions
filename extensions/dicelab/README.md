# Dicelab Raycast Extension

A powerful dice calculator extension for Raycast, using the Dicelab DSL compiled to WebAssembly.

## Features

- **Dice Expression Evaluation**: Roll dice and calculate results using the full Dicelab DSL
- **Probability Distributions**: View PMF charts with statistics (mean, std dev, variance, quantiles)
- **Persistent Context**: Your aliases and variables are saved between sessions
- **Aliases Management**: Define and view aliases using `let name = value`
- **D&D Beyond Import**: Import character stats directly from D&D Beyond
- **Full DSL Support**:
  - Dice notation: `d20`, `2d6+3`, `4d6kh3`
  - Variables: `let strength = 18`
  - Roll assignments: `let attack = d20 strength_mod`
  - Conditionals: `d20 > 10 ? 1d8 : 0`
  - Named groups: `(attack: d20+5, damage: 2d6+3)`
  - Advantage/disadvantage: `d20adv`, `d20dis`
  - Filters: `kh`, `kl`, `dh`, `dl`, `rr`, `ro`

## License

MIT
