```fortran
subroutine claqr1 (
        integer n,
        complex, dimension( ldh, * ) h,
        integer ldh,
        complex s1,
        complex s2,
        complex, dimension( * ) v
)
```

Given a 2-by-2 or 3-by-3 matrix H, CLAQR1 sets v to a
scalar multiple of the first column of the product

(\*)  K = (H - s1\*I)\*(H - s2\*I)

scaling to avoid overflows and most underflows.

This is useful for starting double implicit shift bulges
in the QR algorithm.

## Parameters
N : INTEGER [in]
> Order of the matrix H. N must be either 2 or 3.

H : COMPLEX array, dimension (LDH,N) [in]
> The 2-by-2 or 3-by-3 matrix H in (\*).

LDH : INTEGER [in]
> The leading dimension of H as declared in
> the calling procedure.  LDH >= N

S1 : COMPLEX [in]

S2 : COMPLEX [in]
> 
> S1 and S2 are the shifts defining K in (\*) above.

V : COMPLEX array, dimension (N) [out]
> A scalar multiple of the first column of the
> matrix K in (\*).
