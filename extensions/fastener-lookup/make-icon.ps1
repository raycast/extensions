Add-Type -AssemblyName System.Drawing
$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$bgColor = [System.Drawing.Color]::FromArgb(255, 28, 30, 36)
$accent = [System.Drawing.Color]::FromArgb(255, 245, 158, 11)

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$r = 112; $d = $r * 2
$path.AddArc(0, 0, $d, $d, 180, 90)
$path.AddArc($size - $d, 0, $d, $d, 270, 90)
$path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
$path.AddArc(0, $size - $d, $d, $d, 90, 90)
$path.CloseFigure()
$g.FillPath((New-Object System.Drawing.SolidBrush $bgColor), $path)

$cx = 256; $cy = 256; $R = 178
$pts = New-Object 'System.Drawing.PointF[]' 6
for ($i = 0; $i -lt 6; $i++) {
  $a = [Math]::PI / 180 * (60 * $i)
  $pts[$i] = New-Object System.Drawing.PointF ([float]($cx + $R * [Math]::Cos($a))), ([float]($cy + $R * [Math]::Sin($a)))
}
$g.FillPolygon((New-Object System.Drawing.SolidBrush $accent), $pts)

$g.FillEllipse((New-Object System.Drawing.SolidBrush $bgColor), $cx - 92, $cy - 92, 184, 184)
$pen = New-Object System.Drawing.Pen $accent, 9
$g.DrawEllipse($pen, $cx - 62, $cy - 62, 124, 124)
$g.DrawEllipse($pen, $cx - 32, $cy - 32, 64, 64)

$bmp.Save("C:\dev\raycast-fastener-lookup\assets\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "icon written"
