```fortran
subroutine zsyconv (
        character uplo,
        character way,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        integer, dimension( * ) ipiv,
        complex*16, dimension( * ) e,
        integer info
)
```

ZSYCONV converts A given by ZHETRF into L and D or vice-versa.
Get nondiagonal elements of D (returned in workspace) and
apply or reverse permutation done in TRF.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the details of the factorization are stored
> as an upper or lower triangular matrix.
> = 'U':  Upper triangular, form is A = U\*D\*U\*\*T;
> = 'L':  Lower triangular, form is A = L\*D\*L\*\*T.

WAY : CHARACTER\*1 [in]
> = 'C': Convert
> = 'R': Revert

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in,out]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by ZSYTRF.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by ZSYTRF.

E : COMPLEX\*16 array, dimension (N) [out]
> E stores the supdiagonal/subdiagonal of the symmetric 1-by-1
> or 2-by-2 block diagonal matrix D in LDLT.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
