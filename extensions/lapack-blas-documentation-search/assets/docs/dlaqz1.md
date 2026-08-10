```fortran
subroutine dlaqz1 (
        double precision, dimension( lda, * ), intent(in) a,
        integer, intent(in) lda,
        double precision, dimension( ldb, * ), intent(in) b,
        integer, intent(in) ldb,
        double precision, intent(in) sr1,
        double precision, intent(in) sr2,
        double precision, intent(in) si,
        double precision, intent(in) beta1,
        double precision, intent(in) beta2,
        double precision, dimension( * ), intent(out) v
)
```

Given a 3-by-3 matrix pencil (A,B), DLAQZ1 sets v to a
scalar multiple of the first column of the product

(\*)  K = (A - (beta2\*sr2 - i\*si)\*B)\*B^(-1)\*(beta1\*A - (sr2 + i\*si2)\*B)\*B^(-1).

It is assumed that either

1) sr1 = sr2
or
2) si = 0.

This is useful for starting double implicit shift bulges
in the QZ algorithm.

## Parameters
A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> The 3-by-3 matrix A in (\*).

LDA : INTEGER [in]
> The leading dimension of A as declared in
> the calling procedure.

B : DOUBLE PRECISION array, dimension (LDB,N) [in]
> The 3-by-3 matrix B in (\*).

LDB : INTEGER [in]
> The leading dimension of B as declared in
> the calling procedure.

SR1 : DOUBLE PRECISION [in]

SR2 : DOUBLE PRECISION [in]

SI : DOUBLE PRECISION [in]

BETA1 : DOUBLE PRECISION [in]

BETA2 : DOUBLE PRECISION [in]

V : DOUBLE PRECISION array, dimension (N) [out]
> A scalar multiple of the first column of the
> matrix K in (\*).
