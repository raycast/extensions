
Add-Type -AssemblyName System.Drawing

$width = 512
$height = 512
$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

# Define rounded rectangle path
# Adjust coordinates to ensure it fits within the bitmap without clipping
$rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
$radius = 115
$diameter = $radius * 2
$path = New-Object System.Drawing.Drawing2D.GraphicsPath

# Top-Left Arc
$path.AddArc(0, 0, $diameter, $diameter, 180, 90)
# Top-Right Arc
$path.AddArc($width - $diameter, 0, $diameter, $diameter, 270, 90)
# Bottom-Right Arc
$path.AddArc($width - $diameter, $height - $diameter, $diameter, $diameter, 0, 90)
# Bottom-Left Arc
$path.AddArc(0, $height - $diameter, $diameter, $diameter, 90, 90)

$path.CloseFigure()

# Fill background
$purpleColor = [System.Drawing.ColorTranslator]::FromHtml("#5B3CC4")
$brush = New-Object System.Drawing.SolidBrush $purpleColor
$graphics.FillPath($brush, $path)

# Draw text "S"
$fontFamily = New-Object System.Drawing.FontFamily "Arial"
# Use integer 1 for Bold (FontStyle.Bold = 1)
$fontStyle = [System.Drawing.FontStyle]::Bold
$font = New-Object System.Drawing.Font($fontFamily, 320, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)

$textBrush = [System.Drawing.Brushes]::White
$stringFormat = New-Object System.Drawing.StringFormat
$stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

# Center the text
$rectF = New-Object System.Drawing.RectangleF 0, 20, $width, $height
$graphics.DrawString("S", $font, $textBrush, $rectF, $stringFormat)

$outputPath = "c:\Users\Ahmed\Documents\GitHub\Raycast--Stealth-AI\icon.png"
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()

Write-Host "Icon generated successfully at $outputPath"
