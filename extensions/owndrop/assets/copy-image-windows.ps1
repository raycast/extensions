$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$image = $null
$bitmap = $null
$png = $null
try {
    $image = [System.Drawing.Image]::FromFile($env:OWNDROP_CLIPBOARD_IMAGE_PATH)
    $bitmap = New-Object System.Drawing.Bitmap($image)
    $png = New-Object System.IO.MemoryStream
    $image.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
    $png.Position = 0

    $data = New-Object System.Windows.Forms.DataObject
    $data.SetData('PNG', $false, $png)
    $data.SetData([System.Windows.Forms.DataFormats]::Bitmap, $true, $bitmap)
    # Persist both image formats after this helper exits; never add FileDrop.
    [System.Windows.Forms.Clipboard]::SetDataObject($data, $true, 10, 100)
} catch {
    [Console]::Error.WriteLine('Could not copy image pixels. The image format may not be supported by Windows. Use Download to Downloads instead.')
    exit 1
} finally {
    if ($png) { $png.Dispose() }
    if ($bitmap) { $bitmap.Dispose() }
    if ($image) { $image.Dispose() }
}
