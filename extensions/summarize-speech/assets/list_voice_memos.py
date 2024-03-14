import os

voice_memos_path = os.path.expanduser('~/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings')

try:
    files = os.listdir(voice_memos_path)
    m4a_files = [file for file in files if file.endswith('.m4a')]

    # Sort files by their modification time
    memos_with_times = [(file, os.path.getmtime(os.path.join(voice_memos_path, file))) for file in m4a_files]
    memos_with_times.sort(key=lambda x: x[1], reverse=True)

    for file, _ in memos_with_times:
        full_path = os.path.join(voice_memos_path, file)
        print(f"{full_path}|{file}")
except FileNotFoundError:
    print("Voice Memos directory not found.")
