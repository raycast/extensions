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

public class Program {
    public static int Main(string[] args) {
        string imagePath = "";
        for (int i = 0; i < args.Length; i++) {
            if ((args[i].Equals("-ImagePath", StringComparison.OrdinalIgnoreCase) || args[i].Equals("-File", StringComparison.OrdinalIgnoreCase)) && i + 1 < args.Length) {
                imagePath = args[++i];
            }
        }

        if (string.IsNullOrEmpty(imagePath) && args.Length > 0 && !args[0].StartsWith("-")) {
            imagePath = args[0];
        }

        if (string.IsNullOrEmpty(imagePath)) {
            Console.WriteLine("ERROR|No image path provided");
            return 1;
        }

        try {
            string fullPath = Path.GetFullPath(imagePath);
            if (!File.Exists(fullPath)) {
                Console.WriteLine("ERROR|File not found: " + fullPath);
                return 1;
            }

            StorageFile file = WinRTHelper.Await<StorageFile>(StorageFile.GetFileFromPathAsync(fullPath));
            using (IRandomAccessStream stream = WinRTHelper.Await<IRandomAccessStream>(file.OpenAsync(FileAccessMode.Read))) {
                BitmapDecoder decoder = WinRTHelper.Await<BitmapDecoder>(BitmapDecoder.CreateAsync(stream));
                using (SoftwareBitmap bitmap = WinRTHelper.Await<SoftwareBitmap>(decoder.GetSoftwareBitmapAsync())) {
                    OcrEngine engine = OcrEngine.TryCreateFromUserProfileLanguages();

                    if (engine == null) {
                        engine = OcrEngine.TryCreateFromLanguage(new Language("en-US"));
                    }

                    if (engine == null) {
                        Console.WriteLine("ERROR|Windows OCR engine unavailable");
                        return 1;
                    }

                    OcrResult result = WinRTHelper.Await<OcrResult>(engine.RecognizeAsync(bitmap));
                    string txt = result.Text;

                    if (string.IsNullOrWhiteSpace(txt)) {
                        Console.WriteLine("SUCCESS|NO_TEXT");
                    } else {
                        Console.WriteLine("SUCCESS|TEXT|" + txt);
                    }
                    return 0;
                }
            }
        } catch (Exception ex) {
            Console.WriteLine("ERROR|" + ex.Message);
            return 1;
        }
    }
}
