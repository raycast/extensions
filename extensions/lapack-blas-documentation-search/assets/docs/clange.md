```fortran
real function clange (
        character norm,
        integer m,
        integer n,
        complex, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) work
)
```

CLANGE  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
complex matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in CLANGE as described
> above.

M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.  When M = 0,
> CLANGE is set to zero.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.  When N = 0,
> CLANGE is set to zero.

A : COMPLEX array, dimension (LDA,N) [in]
> The m by n matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(M,1).

WORK : REAL array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= M when NORM = 'I'; otherwise, WORK is not
> referenced.
