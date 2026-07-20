```fortran
subroutine slaqr1 (
        integer n,
        real, dimension( ldh, * ) h,
        integer ldh,
        real sr1,
        real si1,
        real sr2,
        real si2,
        real, dimension( * ) v
)
```

Given a 2-by-2 or 3-by-3 matrix H, SLAQR1 sets v to a
scalar multiple of the first column of the product

(\*)  K = (H - (sr1 + i\*si1)\*I)\*(H - (sr2 + i\*si2)\*I)

scaling to avoid overflows and most underflows. It
is assumed that either

1) sr1 = sr2 and si1 = -si2
or
2) si1 = si2 = 0.

This is useful for starting double implicit shift bulges
in the QR algorithm.

## Parameters
N : INTEGER [in]
> Order of the matrix H. N must be either 2 or 3.

H : REAL array, dimension (LDH,N) [in]
> The 2-by-2 or 3-by-3 matrix H in (\*).

LDH : INTEGER [in]
> The leading dimension of H as declared in
> the calling procedure.  LDH >= N

SR1 : REAL [in]

SI1 : REAL [in]

SR2 : REAL [in]

SI2 : REAL [in]
> The shifts in (\*).

V : REAL array, dimension (N) [out]
> A scalar multiple of the first column of the
> matrix K in (\*).
