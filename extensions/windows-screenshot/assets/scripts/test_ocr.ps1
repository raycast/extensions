param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime

    $null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
    $null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation.UniversalApiContract, ContentType = WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
    $null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]

    $cSharpCode = @"
using System;
using System.Reflection;

public static class WinRTAwaiter {
    public static object AwaitOp(object asyncOp, Type returnType) {
        Type extType = typeof(WindowsRuntimeSystemExtensions);
        MethodInfo[] methods = extType.GetMethods(BindingFlags.Public | BindingFlags.Static);
        MethodInfo targetMethod = null;
        foreach (MethodInfo m in methods) {
            if (m.Name == "AsTask" && m.IsGenericMethod && m.GetParameters().Length == 1) {
                targetMethod = m;
                break;
            }
        }
        MethodInfo closedMethod = targetMethod.MakeGenericMethod(returnType);
        object task = closedMethod.Invoke(null, new object[] { asyncOp });
        PropertyInfo resultProp = task.GetType().GetProperty("Result");
        return resultProp.GetValue(task);
    }
}
"@
    Add-Type -TypeDefinition $cSharpCode -ReferencedAssemblies "System.Runtime.WindowsRuntime.dll"

    $fullPath = [System.IO.Path]::GetFullPath($ImagePath)
    if (-not (Test-Path -Path $fullPath)) {
        Write-Output "ERROR|File not found: $fullPath"
        exit 1
    }

    $fileOp = [Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPath)
    $file = [WinRTAwaiter]::AwaitOp($fileOp, [Windows.Storage.StorageFile])

    $streamOp = $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    $stream = [WinRTAwaiter]::AwaitOp($streamOp, [Windows.Storage.Streams.IRandomAccessStream])

    $decoderOp = [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
    $decoder = [WinRTAwaiter]::AwaitOp($decoderOp, [Windows.Graphics.Imaging.BitmapDecoder])

    $bmpOp = $decoder.GetSoftwareBitmapAsync()
    $bmp = [WinRTAwaiter]::AwaitOp($bmpOp, [Windows.Graphics.Imaging.SoftwareBitmap])

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguage()
    if ($null -eq $engine) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("en-US"))
    }

    if ($null -eq $engine) {
        Write-Output "ERROR|Windows OCR engine is not available on this system."
        exit 1
    }

    $ocrOp = $engine.RecognizeAsync($bmp)
    $result = [WinRTAwaiter]::AwaitOp($ocrOp, [Windows.Media.Ocr.OcrResult])

    $extractedText = $result.Text
    if ([string]::IsNullOrWhiteSpace($extractedText)) {
        Write-Output "SUCCESS|NO_TEXT"
    } else {
        Write-Output "SUCCESS|TEXT|$extractedText"
    }
} catch {
    Write-Output "ERROR|$($_.Exception.Message)"
}
