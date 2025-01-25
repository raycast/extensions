# 🚀 Quick Image

> Effortless Image Conversion, Resizing, Concatenation, and PDF Creation

Quick Image is a fast, text-based tool that allows you to convert, resize, concatenate images, and create PDFs from Raycast command line. With a simple command, like `jpg | ver | pdf`, you can easily convert images to jpg, concat them veritcally and output a pdf file

## 🌟 Features

- **Convert and Resize image**: Quickly convert images between formats like JPG, PNG, WebP. Resize with customizable dimensions.
- **Concatenate Images**: Combine multiple images into one, either horizontally or vertically, with customizable gaps and backgrounds.
- **Create PDFs**: Easily create a PDF document.
- **Text-Based Command**: Provides a powerful way to automate repetitive image processing tasks with simple text commands.
- **Pipelining Commands**: Chain commands together to perform multiple operations at once
- **Default Command**: Hit Enter to convert images to jpg with a large size, making it perfect for everyday use.

## ⚡ Using Quick Image

1. Select the images you want to process in the Finder app.
2. Run the Quick Image command in Raycast to perform operations on the selected images.

## 📋 List of Commands

### Convert and Resize Images

Easily convert and resize images using the following commands:

```sh
<empty>      # Convert to jpg with large size
jpg 100x200  # Convert to jpg with 100 width, 200 height
jpg 100      # Convert to jpg with 100 width, auto height
jpg x200     # Convert to jpg with auto width, 200 height
jpg o        # Convert to jpg with original size
jpg 100x200 pos:ne # Convert and crop with northeast position
```

**Command Syntax**

```sh
Syntax: [format=jpg] [size=l] [pos:c]
format: jpg | png | webp
size: xl | l | m | o | <width>x<height> | <width> | x<height>  # extra large | large | middle | small | original
pos: c | n | ne | e | se | s | sw | w | nw # position: center | north | northeast | east | southeast | south | southwest | west | northwest
```

### Concatenate Images

Concatenate images horizontally or vertically with customizable gaps and backgrounds:

```sh
hor                      # Concatenate horizontally with black 3px gap and transparent background
hor gap:white            # Concatenate horizontally  with white gap
hor gap:white,5 bg:black # Concatenate horizontally with white 5px gap and black background
ver                      # Concatenate vertically
```

**Command Syntax**

```sh
Syntax: <direction> [gap:black,3] [bg:transparent]
direction: hor | ver  # horizontal | vertical
gap: <color>,[size]   # gap color, size
bg: <color>           # background color
```

### Create PDF

```sh
pdf       # create PDF
```

### Pipeline Operations

You can chain commands to perform multiple operations in a single command:

```sh
jpg | ver | pdf  # Convert to jpg, concatenate vertically, and output as a pdf
```

### Command Syntax

The basic syntax for all commands is:

```sh
Syntax: [operation] [argument] [option:value1,value2] .. | ..
Operation: The main task you want to perform, e.g. jpg to convert image
Argument: Argument pass to operation, e.g. 100x200
Option: Option pass to operation, e.g. bg:white
```
