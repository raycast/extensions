try {
    [System.Threading.EventWaitHandle]::OpenExisting('Global\NonExistentEventHandle_RandomString_12345').Set()
} catch {
    Write-Host "Caught Exception: $_"
    exit 1
}
