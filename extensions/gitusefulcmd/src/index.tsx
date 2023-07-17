import { Detail } from "@raycast/api";

export default function Command() {
  return (
    <Detail
      markdown="
  ## ssh
  ```
  eval \`ssh-agent\`

  ssh-add ~/.ssh/KEY_FILE_NAME
  ```

  ## ssh-add
  ```
  ssh-add ~/.ssh/KEY_FILE_NAME

  ssh -T git@github.com
  ```
  
  ## git ローカル レビュー
  ```
  git fetch origin pull/ID/head:BRANCH_NAME
  ```

  ## 直前のコミットメッセージ変更
  ```
  git commit --amend -m 'fixed commit message'
  ```

  ### git stash
  ```
  git stash -u
  ```
  ## 戻す
  ```
  git stash apply stash@{0}
  ```
  ### 消す
  ```
  git stash drop stash@{0}
  ```
  ## git remote
  ```
  git remote set-url origin {new url}
  ```
  ## cz
  ```
  npx git-cz
  ```
  ## コミットを2つ取り消す
  ```
  git reset --soft HEAD~2
  ```
  ## pre-commit 無視
  ```
  git commit --no-verify
  ```
  ## git branch -D まとめて
  ```
  git branch | grep <文字列> |  while read branch ; do git branch -D ${branch} ; done ; 
  ```
  ## rebase
  ```
  git rebase -i HEAD~2

  git pull --rebase origin master
  ```
  ## tag
  ### masterにマージして、remoteにマージコミットが作成されたら
  ```
  git sw master

  git pull origin master

  git fetch origin

  git log
  ```
  ## tagを追加
  ```
  git tag タグ名 マージコミットハッシュ
  ```
  ## tagを確認
  ```
  git show タグ名
  ```
  ## tagをプッシュ
  ```
  git push origin タグ名
  ```
  "
    />
  );
}
