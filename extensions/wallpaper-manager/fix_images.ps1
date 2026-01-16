Add-Type -AssemblyName System.Drawing
$files = @("assets\wallpaper-manager.png", "assets\wallpaper-cycler.png")
foreach ($file in $files) {
    try {
        $fullPath = (Resolve-Path $file).Path
        Write-Host "Processing $fullPath..."
        
        # Load the image (even if extension is wrong, .NET reads header)
        $img = [System.Drawing.Image]::FromFile($fullPath)
        
        # Save explicitly as PNG
        $fixedPath = $fullPath + ".fixed.png"
        $img.Save($fixedPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        
        # Overwrite original
        Move-Item -Path $fixedPath -Destination $fullPath -Force
        Write-Host "Success: Converted $file to valid PNG."
    } catch {
        Write-Host "Error converting $file : $_"
    }
}
