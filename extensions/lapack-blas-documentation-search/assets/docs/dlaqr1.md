```fortran
subroutine dlaqr1 (
        integer n,
        double precision, dimension( ldh, * ) h,
        integer ldh,
        double precision sr1,
        double precision si1,
        double precision sr2,
        double precision si2,
        double precision, dimension( * ) v
)
```

Given a 2-by-2 or 3-by-3 matrix H, DLAQR1 sets v to a
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

H : DOUBLE PRECISION array, dimension (LDH,N) [in]
> The 2-by-2 or 3-by-3 matrix H in (\*).

LDH : INTEGER [in]
> The leading dimension of H as declared in
> the calling procedure.  LDH >= N

SR1 : DOUBLE PRECISION [in]

SI1 : DOUBLE PRECISION [in]

SR2 : DOUBLE PRECISION [in]

SI2 : DOUBLE PRECISION [in]
> The shifts in (\*).

V : DOUBLE PRECISION array, dimension (N) [out]
> A scalar multiple of the first column of the
> matrix K in (\*).
