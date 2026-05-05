```fortran
subroutine slaqz1 (
        real, dimension( lda, * ), intent(in) a,
        integer, intent(in) lda,
        real, dimension( ldb, * ), intent(in) b,
        integer, intent(in) ldb,
        real, intent(in) sr1,
        real, intent(in) sr2,
        real, intent(in) si,
        real, intent(in) beta1,
        real, intent(in) beta2,
        real, dimension( * ), intent(out) v
)
```

Given a 3-by-3 matrix pencil (A,B), SLAQZ1 sets v to a
scalar multiple of the first column of the product

(\*)  K = (A - (beta2\*sr2 - i\*si)\*B)\*B^(-1)\*(beta1\*A - (sr2 + i\*si2)\*B)\*B^(-1).

It is assumed that either

1) sr1 = sr2
or
2) si = 0.

This is useful for starting double implicit shift bulges
in the QZ algorithm.

## Parameters
A : REAL array, dimension (LDA,N) [in]
> The 3-by-3 matrix A in (\*).

LDA : INTEGER [in]
> The leading dimension of A as declared in
> the calling procedure.

B : REAL array, dimension (LDB,N) [in]
> The 3-by-3 matrix B in (\*).

LDB : INTEGER [in]
> The leading dimension of B as declared in
> the calling procedure.

SR1 : REAL [in]

SR2 : REAL [in]

SI : REAL [in]

BETA1 : REAL [in]

BETA2 : REAL [in]

V : REAL array, dimension (N) [out]
> A scalar multiple of the first column of the
> matrix K in (\*).
