import { Detail, popToRoot, showToast, Toast, Icon, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import json2md from "json2md";

import { fetchFact } from "./api";
import { ChuckFact } from "./types";

export default function Command() {
  const [fact, setFact] = useState<ChuckFact>();
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const fact = await fetchFact();
      setFact(fact);
    } catch (error) {
      showToast(Toast.Style.Failure, "Something went wrong", "Failed to load the fact.");
      popToRoot();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Detail
      isLoading={loading}
      markdown={json2md(
        fact
          ? [
              { h1: "Chuck Norris Fact" },
              { blockquote: fact.value },
              {
                img: {
                  source:
                    "data:image/gif;base64,R0lGODlhMgAyALMMAH2n2XNzc9uSav/MACgsNSgsNoC+1v2yiYxiOT09PScsNcyZM////wAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAMACwAAAAAMgAyAAAE/5DJSau9OOs9lbKex41c+HXmSa6Vl6RK8opszbiyKee0TeIzIM/3i+1yxyGxZEw6Z0tN6PkMRTFC6s56vamyWmXU5A2EnVZubeoJuM3nN0zFyr7dzze6V28m74BwR2o+OmeDKV0Sc2CMdGOOkR4Ij0uTCAeZjpmZCJ6VRJeco6SjnpSKXp4HHpwCma+aCgenoIUKn5qwu6yatamXCAKxmJzFw7W2NsGdnrECp82oqaqn1tfXfF0h1rOluMnUi+DOc9CfypDWpbTo4hTc2Nnp28HyhO/j9sna4ozdifKFAADA0QKC/eohNHiwIL1bDr95WLBAAUKBFr2NGkjRosN3klU8VvSYsB4MggAMzMkHTwHFkSY4lVQ0EWZMWSxRdNS4cSZNlzB7+vy501FOnRQdmhh51EuKAVAHwDg6J6rUgCzBVHkYKoshMSCFwNgytKsfGkDwaYgAACH5BAkKAAwALAAAAAAyADIAAAT/kMlJq704602Vsp7HjVz4TaZIrqCSpO6rsrSX3OaNzzRp7z8dr7cJCnXCE7EUQzqTy6LxiQxFM1NqUnmdZbW7q8TE8ATAVKu1F5IF3md0Ag7jrqbwNxX+XNeaTnmCcVVDf19gMGIodYBAiotljZMmCHZRHggIB5yTnJyalpGSmp+mp6ahl0uZmx6fApyxnQoHqqOttQe6s7O6CreRrQgCs5ufx8Wqq0TDoJq9oc+io6Sh19jYhl3Dlqi719vc1wJ1AsvVHcDSqOjpjOvZ4cy43dl+75KV9+LCjfP40nkAQHDBgjoLAPTjRtCDwYQEATxUSI8hRQUGIz5U0LAiK46TVTZ2zGfiUwqDAynm0/et0coxJWm9ovVS0kEYpgIKxIhypkyP3B4mnFTTZsaOKYoahVhwI1BuKQZIhfSyjtQBVFcicrJQjJEUhaoCqgNF61glX59SiAAAIfkEBQoADAAsAAAAADIAMgAABP+QyUmrvTjrzbv/jKJYogieVDlOqomeYtIqiey+Xlyr9X7jG51N6ANyiLte72e8IJVQZpP1hC6l06rVt2retFtbthRSBMJhMhlVsgXeZ3QNPuuCkPD3Fm5dw2h7eYJ9WB88clEtUxJ1T412Ro+SJQiQQCIICAebj5ubmZWLZZmepaaloJY4mJoingKbsJwKB6mirLQHubKyuQq2i6wIArKansbEqaovwp+ZvKDOoaKjoNbX14WrwpWnutba29YCdQLK1Cm/0afn6FTq2ODLY5TxmX7ojfH4+QoA/y3khbvkD+CCg3UAumNUUMTBBf/+IQQ4jyBFBQtKSMxIcWEZSRNXAQzc5suVLhUdF5bwtPKkxooEW84yxe8Wxoy5XM7wWOZhC5wqeDp8SBGAT5hebkKMaBQh0kgzBkjdyfOjCqkDqAoFJGckVCUtrlQtcyWsmKpCvnD1eiECACH5BAkKAAwALAsAAgAgADAAAARfkMlJq7046827/2AojmRpnmiqrmzrvnAsz3Rt33iuy8AOKyaF4nAQohYTYhEIAvYkC8BTyfw4JU6AUMl4krLbQ1crEjOEUqPCax2a18igkdhlLOIlYbWyF+l9gIGCLREAIfkECQoADAAsAAAAADIAMgAABP+QyUmrvTjrzbv/YCgqikWSYnqW04qmIJm4SjK/cCfbq83jOc3uNvwFN0Wezwc8mmrL6LLplJykWGK1ksz+WEdc13tzrhikAFl6QlN1snRgvk7MAzRwDOq706V3bG8cY3Z+h4J6I1d1TC5beV2RijmTlicIlDAkCAgHn5Ofn52ZkAqdoqmqqaSaKqeeJKICn7SgCgetpp24B722tr2wpVWcnQK2nqLKyK2ui6Sjx7XRubxbVsOk29zO2G7avarhz5vaAnkC3t/Z26vWmeVBmN3cg2Yr9c7y5iQL9PbuzSMBYMG/fPv4vQJQ0KDBPAAEVlLA8GEkhhEVhqAY0aI4UQRNJS5iqMDhiVUURW7k6G9BRkvsCL7E+JIGO3A1T5hU2U9WpAIae747c7NFyRWpiBbNdhDmUnCXePY8MaCqzaeFpgR9pZVRGax88jjKEQEAIfkEBQoADAAsAAAAADIAMgAABP+QyUmrvTjrzbv/jKJYogieVDlOqomeYtIqiey+Xlyr9X7jG51N6ANyiLte72e8IJVQZpP1hC6l06rVt2retFtbthRSBMJhMhlVsgXeZ3QNPuuCkPD3Fm5dw2h7eYJ9WB88clEtUxJ1T412Ro+SJQiQQCIICAebj5ubmZWLZZmepaaloJY4mJoingKbsJwKB6mirLQHubKyuQq2i6wIArKansbEqaovwp+ZvKDOoaKjoNbX14WrwpWnutba29YCdQLK1Cm/0afn6FTq2ODLY5TxmX7oKgD12eGRCgACtpDnbxvAgAsS1tlXkM1BBQkTBhQogqK7MgIjLrToriJDhSpPODGcd+lhyFP48gGkdVKXiouMSpRqBPOdTE8iFjT8J0knyTEaZyisSSXiRIQgiZZpMaDpDKV1mg54ShTMFaiAuAjZue1KiyJVs34R+zNDBAAh+QQFCgAMACwRAB8AEAAMAAAEMJAxIKu9OEuqu14euEnKBZaWonCd6lJAiR6HS1sHLtG3mroMHgMlsnBQJoBSufBZIgAh+QQFCgAMACwRACEAEgALAAAENlCxyZSkOE97jtUZ11ELuHXHBCylBGSop6zUZb3o3TKjXc+AD29jWl06wgzgVepdTKEntGKKAAAh+QQFCgAMACwOACAAFQAMAAAEQJApRmW9mE4ApJqZVoHfYR7XtGDgaYrVmmrkF4b293EYjy1ATsfm6VgowCBNBPoFjadME7ng6F6zm4eovXGnjAgAIfkECQoADAAsDQADAB4ALwAABFaQyUmrvTjrzbv/YCiOZGmeaKqubOu+cCzPdG3feA4CqUItwAvPAwAojsBicaQ8HiVDJuNwoPhK1Cz1OSoctZRtyFmhTknXq4QrZTjVpGULuNDZ73hTBAAh+QQJCgAMACwAAAAAMgAyAAAE/5DJSau9OOtNlbKex41c+E2mSK6gkqTuq7K0l9zmjc80ae8/Ha+3CQp1whOxFEM6k8ui8YkMRTNTalJ5nWW1u6vExPAEwFSrtReSBd5ndAIO466m8DcV/lzXmk55gnFVQ39fYDBiKHWAQIqLZY2TJgh2UR4ICAeck5ycmpaRkpqfpqemoZdLmZsenwKcsZ0KB6qjrbUHurOzugq3ka0IArObn8fFqqtEw6CavaHPoqOkodfY2IZdw5aou9fb3NcCdQLL1R3A0qjo6Yzr2eHMuN3Zfu+Slffiwo3z+NJ5AEBwwYI6CwD040ZQocEUBhMuxKSAoIeHvxQctEiPIkeMn2BCcMw3EAABjRJ17aqosCOrigRWpjRFwGK+MSpLvuJUcyLFnCx3nvRJ0VRQSDdTdCp4MOC7iykARGx6U11EkVOJ/jQxoCvSpDC6DvhK0pEWrc0ApShU1UgdKGDZ4pS7IgIAIfkECQoADAAsAAAAADIAMgAABP+QyUmrvTjrTZVXlseN3Pd1J6mGXpKYrbjOzOe65i3TZHu/NhyI11P8cEcgsWRMOnfLS9B5TEVZTWp1eK34tNsJdHWagm8BkYkG8wTe58T7HRuPzK65cw7/2VV4cnyDVH9kMHF+VkttgY2GbAiPkzBdEgoImQebB5OcmZAzmJqcpaafklxXowidCpwCm7GbHgegqlGsr52yvbydt5Y1rAKzrZ+yApmpwjXLm8uzyqTLoaKsy9na1bir2Lum39ZsxI3Twc1irKe23Ole2Nu33c0f8tz09fbba+8oJtke+bukAACABZMMLtJncAHChADGsVHo8MMpDxHzMSoY0WFGcJxXCko8pFDBgpKU3jUyYPBjJX+1aMFw+HAgipBtKmq0ZPGiyZo2CcaU+XPkxkk6gxJ8aOJg0qBtBkgd0AgqjKlU21hNZJScoi9Cdh7VgYisWCJTZIBdqCECACH5BAkKAAwALAAAAAAyADIAAAT/kMlJq7046z2VV5bHjdz3USapXl+SmN4LrjTTunLsirWq4ybgrDf6AXFCYkmBbDZ5SszN6TxFWUYqEnpFMbVUKHd1moKRAVGKBvME3mfX+x2zkrOJOXUO3w5rZnJ8g1pjgDBxT3ZKbYE5bV0SCgiNlY2RNgiaB5wHlp2ahkSTm52mp6CUf1GkCJ4KnQKcspweB6GrjJqUtbO+nrW4mB67ArSuoLMCu6Kju5zFs8+3wsOtu9jZzLms17Co3s2MrQKNy9uYFcSlp9jiXeva7u9XH/Lb3Ok28fNr+h0m+kH6J0kBgAWNFiwAwJDeuIMKGTJUiNAgAIeHGlKUqPBDw3zdWDR2rHQR5MOSIz908qevEqpXJrutVFmL5T+aNWFUJOjF1kwFFDF2awRxJM+eJjgaPVqQ4kKlO5nuMzGg6iWmbaoOuMoTT5iY3fyYEdrjRyM/Xb/sGGIEYwQAIfkEBQoADAAsAAAAADIAMgAABP+QyUmrvTjrzbvvSqhY4WeSYjmlZ8uISZKG8uh+cFzTsXpzPF1KaPttgkId0ahBKp81JiYHhYqkKEV168NKnNvlt3i6UsPKQIlVnikCcHQMDqdd29onvUqPK7t4UH2DAVxkLm5yT2xGbmc9joc/CgiRljNelAgIB50Hlp6bgJObnJ6nqKGVkjeanCGeAp2ynbCirIilCrWzvZ+1t5muArSmnabEuri5m8ebtAKlzqteL66l2NnK1dbYu6nXd9UhpQKO0dvcY9Kp3stS5NrZ4urW19qY9WP3t2769uFSABg4KhNBNwsSKhgIoCCTEAQTMgSQcAHEhu9aLWwoEaMCixdbHTba+BHkJX0hU9SC9UnkQ48sRXiix03mKZYraY6LNLOky4czTIao+BNeyQUYB1YE+W/F0YkUFWY0mmKAVUdNAYawOgBrUzBWpo4kcqbo2B1DIH3NE2WMGA0RAAAh+QQJCgAMACwIAAIAIAAwAAAEYJDJSau9OOvNu/9gKI5kaZ5oqq5s675wLM90bd94ru8UwF+KmUJxOAxTw+JhsjgRixIAoBllBD8+5VBqrV45Cm5x6/uOAEHykbFELdCSsTm0aGaXw3lHL8mv/D+BgoMfEQAh+QQJCgAMACwAAAAAMgAyAAAE/5DJSau9OOvNu/9g+CmkYpFiWpbUmoZlkqzkbL5eLNu1jOKc3m41vAE1wuGueMwkl1Bb86KLRlnT1tPKzE62XJ/xJ2JVw8sAygWjKQJwtAwOr2FB53k8St93VVt9ggFcZC9uclBsQG55PG5ZCgiNlI2RCJgHmgeVm5iGjJgIm6SlpJ9GR5KZJJsCmq+araiXn7KwuJyytFMkogKxo56wAqKgoZkHv7Cimsapqqui09TTx4zSk6ac1tfYv43Fz15azabd5BW+1dR36Qwl7M/u6fHVJQuL9fao+AsA9CIpAOhmgUGDAAi+I5GQYCOECvcRNOVvIMCFAxVQJHHQojcclUNKADDIMCK5Sg0dJvzYxF8+Nw7ftShAiZM+mSu23cRZgtSKlzK1hAQaVEJISEXdDFhqKamCRCxbPhVzJiq2IjT+YIgAACH5BAUKAAwALAAAAAAyADIAAAT/kMlJq704682770qoWOFnkmI5pWfLiEmShvLofnBc07F6czxdSmj7bYJCHdGoQSqfNSYmB4WKpChFdevDSpzb5bd4ulLDykCJVZ4pAnB0DA6nXdvaJ71Kjyu7eFB9gwFcZC5uck9sRm5nPY6HPwoIkZYzXpQICAedB5aem4CTm5yep6ihlZI3mpwhngKdsp2woqyIpQq1s72ftbeZrgK0pp2mxLq4uZvHm7QCpc6rXi+updjZytXW2Lup13fVIaUCjtHb3GPSqd7LUuTa2eLq1tfamPVj97cKAIzqUrgTAaDgKCwEHS1YWPDfQSYhDEZsuHChP4f1JjqcUfHiw0YRU79xXDDxI8hvqGZI1GcPVi0RnzCy3DfjFEB9IUii/JRvZs5LJjNZdNPxHUIFFRsWLDqTZogBUB01dQN1gFSfedAEhZh1xh+jXCF5hYRVjDWzGSIAACH5BAUKAAwALBIAHwAQAAwAAAQxkMlJJ6g463zn2pQidczHKWJYUgDqgtJxuLIkKq0o18xB+bZezZXKpEieCmoBaDZNEQAh+QQFCgAMACwQACEAEgALAAAEN5DJSZlSFFd5z7kbtUzep02AxSxLypSndrZdmb2HSis2gGk5iwLgi01qnFboiPGsGMSlUEpVLSMAIfkEBQoADAAsEAAgABUADAAABD6QyUmpsrhOxRkAzEUtIXWcR1eOGXpKoraptPRVH9epK0BfH8BiKCuJVMIhaaNB2ZJLpinF+RCLFh02E4rJIgAh+QQJCgAMACwIAAMAHgAvAAAEVZDJSau9OOvNu/9gKI5kaZ5oqq5s675wLM90bd94/gIiby1AiqIHKAIVyCLJh0wqR8PJ4cDwiZDT7DSk2EqzyEKI6p00r1FJNA09V1nPE3Chq9vvoQgAIfkEBQoADAAsAAAAADIAMgAABP+QyUmrvTjrPZVXlseN3PdRJqleX5KY3guuNNO6cuyKtarjJuCsN/oBcUJiSYFsNnlKzM3pPEVZRioSekUxtVQod3WagpEBUYoG8wTeZ9f7HbOSs4k5dQ7fDmtmcnyDWmOAMHFPdkptgTltXRIKCI2VjZE2CJoHnAeWnZqGRJObnaanoJR/UaQIngqdApyynB4HoauMmpS1s76etbiYHrsCtK6gswK7oqO7nMWzz7fCw6272NnMuazXsKjezYytAo3L25gVxKWn2OJd69ru71cf8tvc6Tbx82v6HSb6QfonSQGABY0WLADAkN64gwphRGQIwOGhhgi/eYhosGK+bg1hbdVSwDEkQQ8hO6GMSMDkSYYETK201dLixZgjU44kWFABTpQeVdrs0aihzI/WNi6sOHIRT6UKPX7IyNOLwqhTOVYFaGKA10tb23gdAPbplzhDD/kxk5bN2UZ+zMYtOHdDBAA7",
                },
              },
            ]
          : []
      )}
      metadata={
        fact && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Created At" text={`${fact?.created_at}`} icon={Icon.Clock} />
            <Detail.Metadata.Label title="Updated At" text={fact?.updated_at} icon={Icon.Clock} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="URL" target={`${fact?.url}`} text="Open in Browser" />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel title="Controls">
          <Action title="Refresh" shortcut={{ modifiers: ["opt"], key: "r" }} onAction={() => fetchData()} />
        </ActionPanel>
      }
    />
  );
}
