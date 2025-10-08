```fortran
subroutine dlascl (
        character type,
        integer kl,
        integer ku,
        double precision cfrom,
        double precision cto,
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        integer info
)
```

DLASCL multiplies the M by N real matrix A by the real scalar
CTO/CFROM.  This is done without over/underflow as long as the final
result CTO\*A(I,J)/CFROM does not over/underflow. TYPE specifies that
A may be full, upper triangular, lower triangular, upper Hessenberg,
or banded.

## Parameters
TYPE : CHARACTER\*1 [in]
> TYPE indices the storage type of the input matrix.
> = 'G':  A is a full matrix.
> = 'L':  A is a lower triangular matrix.
> = 'U':  A is an upper triangular matrix.
> = 'H':  A is an upper Hessenberg matrix.
> = 'B':  A is a symmetric band matrix with lower bandwidth KL
> and upper bandwidth KU and with the only the lower
> half stored.
> = 'Q':  A is a symmetric band matrix with lower bandwidth KL
> and upper bandwidth KU and with the only the upper
> half stored.
> = 'Z':  A is a band matrix with lower bandwidth KL and upper
> bandwidth KU. See DGBTRF for storage details.

KL : INTEGER [in]
> The lower bandwidth of A.  Referenced only if TYPE = 'B',
> 'Q' or 'Z'.

KU : INTEGER [in]
> The upper bandwidth of A.  Referenced only if TYPE = 'B',
> 'Q' or 'Z'.

CFROM : DOUBLE PRECISION [in]

CTO : DOUBLE PRECISION [in]
> 
> The matrix A is multiplied by CTO/CFROM. A(I,J) is computed
> without over/underflow if the final result CTO\*A(I,J)/CFROM
> can be represented without over/underflow.  CFROM must be
> nonzero.

M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> The matrix to be multiplied by CTO/CFROM.  See TYPE for the
> storage type.

LDA : INTEGER [in]
> The leading dimension of the array A.
> If TYPE = 'G', 'L', 'U', 'H', LDA >= max(1,M);
> TYPE = 'B', LDA >= KL+1;
> TYPE = 'Q', LDA >= KU+1;
> TYPE = 'Z', LDA >= 2\*KL+KU+1.

INFO : INTEGER [out]
> 0  - successful exit
> <0 - if INFO = -i, the i-th argument had an illegal value.
