# Easings

Quickly find and grab your favorite easings for creating interactivity & animations.

## Features

- **Built-in Easings**: Access to common cubic-bezier easings (ease-in, ease-out, ease-in-out)
- **Custom Easings**: Add your own cubic-bezier or spring animations
- **Spring Animations**: Create physics-based spring animations with customizable stiffness, damping, and mass
- **Multiple Formats**: Copy values in CSS, Figma, or Motion formats
- **Search**: Search through your custom easings

## Normal Easings

Normal easings use cubic-bezier curves for smooth, predictable transitions. These are the standard timing functions used in CSS and design tools.

- **Ease In**: Starts slow and accelerates
- **Ease Out**: Starts fast and decelerates
- **Ease In Out**: Starts and ends slow, accelerates in the middle
- **Custom**: Define your own cubic-bezier curve for unique motion

### Normal Easing Output Formats

- **CSS**: `cubic-bezier(x1, y1, x2, y2)`
- **Figma**: `x1, y1, x2, y2`
- **Motion**: `cubicBezier(x1, y1, x2, y2)`

## Spring Animations

Spring animations use physics-based easing for natural, bouncy movements:

- **Stiffness**: Controls how fast the animation moves (higher = faster)
- **Damping**: Controls how bouncy the animation is (higher = less bouncy)
- **Mass**: Controls how heavy the animation feels (higher = slower)

### Spring Animation Output Formats

- **CSS**: Uses physics simulation to generate proper `linear()` function with multiple points
- **Figma**: `mass: 1.2, stiffness: 550, damping: 30`
- **Motion**: `mass: 1.2, stiffness: 550, damping: 30`

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT
