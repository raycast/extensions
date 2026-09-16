param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

try {
    $fullPath = [System.IO.Path]::GetFullPath($ImagePath)
    if (-not (Test-Path -Path $fullPath)) {
        Write-Output "ERROR|File not found: $fullPath"
        exit 1
    }

    $cSharpCode = @"
using System;
using System.IO;
using System.Reflection;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;
using Windows.Storage.Streams;
using Windows.Globalization;

public static class WinRTHelper {
    public static T Await<T>(object asyncOp) {
        Type extType = typeof(WindowsRuntimeSystemExtensions);
        MethodInfo target = null;
        foreach (MethodInfo m in extType.GetMethods(BindingFlags.Public | BindingFlags.Static)) {
            if (m.Name == "AsTask" && m.IsGenericMethod && m.GetParameters().Length == 1) {
                target = m;
                break;
            }
        }
        MethodInfo closedMethod = target.MakeGenericMethod(typeof(T));
        object task = closedMethod.Invoke(null, new object[] { asyncOp });
        PropertyInfo prop = task.GetType().GetProperty("Result");
        return (T)prop.GetValue(task);
    }
}

public static class LocalWindowsOcr {
    public static string ExtractText(string path) {
        try {
            string fullPath = Path.GetFullPath(path);
            if (!File.Exists(fullPath)) return "ERROR|File not found: " + fullPath;

            StorageFile file = WinRTHelper.Await<StorageFile>(StorageFile.GetFileFromPathAsync(fullPath));
            using (IRandomAccessStream stream = WinRTHelper.Await<IRandomAccessStream>(file.OpenAsync(FileAccessMode.Read))) {
                BitmapDecoder decoder = WinRTHelper.Await<BitmapDecoder>(BitmapDecoder.CreateAsync(stream));
                using (SoftwareBitmap bitmap = WinRTHelper.Await<SoftwareBitmap>(decoder.GetSoftwareBitmapAsync())) {
                    OcrEngine engine = OcrEngine.TryCreateFromLanguage(new Language("en-US"));
                    if (engine == null) return "ERROR|Windows OCR engine unavailable";

                    OcrResult result = WinRTHelper.Await<OcrResult>(engine.RecognizeAsync(bitmap));
                    string txt = result.Text;
                    return string.IsNullOrWhiteSpace(txt) ? "SUCCESS|NO_TEXT" : "SUCCESS|TEXT|" + txt;
                }
            }
        } catch (Exception ex) {
            return "ERROR|" + ex.Message;
        }
    }
}
"@

    $cp = New-Object System.CodeDom.Compiler.CompilerParameters

    $sysRuntime = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.dll"
    if (Test-Path $sysRuntime) { $cp.ReferencedAssemblies.Add($sysRuntime) | Out-Null }

    $sysWinRt = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\System.Runtime.WindowsRuntime.dll"
    if (Test-Path $sysWinRt) { $cp.ReferencedAssemblies.Add($sysWinRt) | Out-Null }

    $singleWinmd = (Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\UnionMetadata" -Filter "Windows.winmd" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1).FullName
    if ($singleWinmd) {
        $cp.ReferencedAssemblies.Add($singleWinmd) | Out-Null
    }

    if (Test-Path "C:\Windows\System32\WinMetadata") {
        Get-ChildItem "C:\Windows\System32\WinMetadata" -Filter "*.winmd" | ForEach-Object {
            $cp.ReferencedAssemblies.Add($_.FullName) | Out-Null
        }
    }

    Add-Type -TypeDefinition $cSharpCode -CompilerParameters $cp

    $out = [LocalWindowsOcr]::ExtractText($fullPath)
    Write-Output $out
} catch {
    Write-Output "ERROR|$($_.Exception.Message)"
}
