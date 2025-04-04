import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import OpenAI, { APIUserAbortError } from "openai";
import { EmptyTextError } from "@/utils/errors";

/**
 * Raycastの設定値を取得する関数（Preferences型はグローバルな型として `package.json` の `preferences` と同期している）
 *
 * @see https://developers.raycast.com/api-reference/preferences#types
 */
const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};

// OpenAIクライアントを取得する関数（TODO: こういう系はファイルとしてどこに置くのがベスプラなのだろうか）
const getClient = () => {
  return new OpenAI({
    apiKey: getPreferences().openaiApiKey,
  });
};

// targetLanguageをサニタイズする関数（軽めのプロンプトインジェクション対策として20文字制限を設ける）
const sanitizeTargetLanguage = (language: string): string => {
  return language.trim().slice(0, 20);
};

/**
 * TODO: `useAI`というからには、より汎用的なものであるべきだと思う。
 *
 * 改修案、`/utils/hooks/useAI.ts`として、モデルを選択できるようにする、プロンプトを比較的自由にpropsとして渡せるようにする（システムプロンプトの設定と、それに対するユーザーの入力などを包含して入力できるような形）。AbortControllerを使用した中断の仕組みやローディング、エラーハンドリングの仕組みは共通で良いのでこのままにする。これらの機能を備えつつ、`useAI`をラップした`useAITranslate`を作るみたいなことをすると良さそう。そうすると、今後要約機能を作りたいときには、`useAI`をラップした`useAISummarize`を作るみたいなことができるようになる、はず。
 *
 * 難しそうな箇所：
 * - モデル選択の抽象化とLLMクライアントの抽象化
 * - プロンプト(システムプロンプトとユーザーの入力)の抽象化
 * - useEffectの依存配列（現状はユーザーの入力テキストで分かりやすいが、プロンプトを抽象化しようと思ったときにここの依存配列がどうなるか予想できていない）
 */
export const useAI = (inputText: string) => {
  const [generatedText, setGeneratedText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  // ストリーミング処理の適切なクリーンアップ(中断)を実現するためのAbortController（chat.completions.create()の返り値にもあるが、上手く動かなかったので自前実装した）
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    console.log("[🐛DEBUG] useAI.ts__inputText: ", inputText);

    setIsLoading(true);
    setGeneratedText("");

    // 中断処理用のAbortControllerを作成してrefにセット
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    /**
     * NOTE: 厳密な調査はできていないが、このトースト表示処理を上のAbortControllerのセット処理よりも前に実行すると、RefオブジェクトにAbortControllerがセットされる前にReactのStrictModeに起因するアンマウントが発火してしまうためか、初回マウント時のLLMストリーミング処理がクリーンアップされずに残ってしまい、2回目マウント時のLLMストリーミング処理と並行して動いてしまうために、翻訳結果がおかしくなるという現象を確認した。上記挙動を再現したい場合は、この`showToast`処理を`abortControllerRef.current = abortController;`よりも前に実行することで再現可能。
     *
     * MEMO: 「showToast実行 → AbortControllerのrefセット → LLMストリーミング処理実行 → useEffectアンマウント時のクリーンアップ処理」の順に処理が進んでいるとき、初回マウント時のLLMストリーミング処理が実行されている（この時点ではrefのセット処理も動いているはず）にも関わらず、useEffectアンマウント時のクリーンアップ処理では`abort()`が実行できていないという事実から、refにセットするタイミングとアンマウントが実行されるタイミングの処理順が関係していたりするのかもしれない（より詳細に調査したい場合はたくさんデバッグログを仕込んでみると発見があるかも）。
     */
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Translating...",
    });

    try {
      if (!inputText) {
        throw new EmptyTextError();
      }

      const targetLanguage = sanitizeTargetLanguage(getPreferences().targetLanguage ?? "English");
      const systemPrompt = `Please translate the input text into ${targetLanguage}. Do not include any explanations — only provide the translation.`;

      const client = getClient();
      const stream = await client.chat.completions.create(
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: inputText },
          ],
          stream: true,
        },
        {
          // 中断シグナル
          signal: abortController.signal,
        },
      );

      for await (const chunk of stream) {
        // 予期せず中断された場合はループ処理を中断
        if (abortController.signal.aborted) {
          break;
        }

        const deltaContent = chunk.choices[0].delta.content || ""; // deltaは変化量/差分を表す
        setGeneratedText((prev) => prev + deltaContent);
      }

      setIsLoading(false);
      toast.style = Toast.Style.Success;
      toast.title = "Translation successful";
    } catch (error: unknown) {
      // AbortErrorはクリーンアップ時の正常な中断なので無視（主に開発環境でのReactのStrictMode起因で発生する）
      if (error instanceof APIUserAbortError) {
        console.log("[📝INFO] useAI.ts__error: ストリーミング処理が正常に中断されました");
        return;
      }

      if (error instanceof Error) {
        console.error("[🚨ERROR] useAI.ts__error: ", error);
        setError(error);
      }

      setIsLoading(false);
      toast.style = Toast.Style.Failure;
      toast.title = "Translation failed";
    }
  }, [inputText]);

  useEffect(() => {
    generate();

    return () => {
      // コンポーネントのアンマウント時にストリーミング処理を中断する
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [generate]);

  const retry = useCallback(() => {
    generate();
  }, [generate]);

  return {
    data: generatedText,
    isLoading,
    error,
    retry,
  };
};
