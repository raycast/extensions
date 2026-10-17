```fortran
double precision function dlanhs (
        character norm,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) work
)
```

DLANHS  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
Hessenberg matrix A.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in DLANHS as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, DLANHS is
> set to zero.

A : DOUBLE PRECISION array, dimension (LDA,N) [in]
> The n by n upper Hessenberg matrix A; the part of A below the
> first sub-diagonal is not referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(N,1).

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I'; otherwise, WORK is not
> referenced.
