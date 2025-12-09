$ErrorActionPreference = "Stop"
$metadataFolder = "metadata"

if (-not (Test-Path $metadataFolder)) {
    Write-Error "Metadata folder not found!"
    exit 1
}

# Get all PNG and JPG files
$images = Get-ChildItem -Path $metadataFolder -Include *.png, *.jpg, *.jpeg -Recurse

if ($images.Count -eq 0) {
    Write-Host "No images found in $metadataFolder"
    exit 0
}

Add-Type -AssemblyName System.Drawing

foreach ($image in $images) {
    $fullPath = $image.FullName
    $tempPath = $fullPath.Replace($image.Extension, "-temp" + $image.Extension)

    Write-Host "Processing: $($image.Name)..." 

    try {
        $img = [System.Drawing.Image]::FromFile($fullPath)
        
        # Check if resize is actually needed (optional, but good practice, here we force it per request)
        # if ($img.Width -eq 2000 -and $img.Height -eq 1250) { 
        #    Write-Host "  Skipping (already 2000x1250)"
        #    $img.Dispose()
        #    continue 
        # }

        $res = new-object System.Drawing.Bitmap 2000, 1250
        $g = [System.Drawing.Graphics]::FromImage($res)
        
        # High quality settings
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

        $g.DrawImage($img, 0, 0, 2000, 1250)
        
        # Determine format
        $format = [System.Drawing.Imaging.ImageFormat]::Png
        if ($image.Extension -match "jpe?g") { $format = [System.Drawing.Imaging.ImageFormat]::Jpeg }

        $res.Save($tempPath, $format)
        
        $img.Dispose()
        $res.Dispose()
        $g.Dispose()
        
        Move-Item -Path $tempPath -Destination $fullPath -Force
        Write-Host "  Done!"
    }
    catch {
        Write-Error "Failed to resize $($image.Name): $_"
        # Continue with next image instead of strict exit? 
        # User asked to resize "rest", so best to try all.
        # But ErrorActionPreference Stop will halt. Let's start clean for next loop if needed, 
        # actually for loop continues if we handle error. 
        # Let's just let it fail hard to warn user something is wrong.
    }
}

Write-Host "All images processed."
